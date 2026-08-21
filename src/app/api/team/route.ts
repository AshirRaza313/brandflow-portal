import { NextRequest, NextResponse } from "next/server";
import { db, isDbUnavailable, withRetry } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeEmail } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations";
import { z } from "zod";
import { getRoleByName } from "@/lib/roles";
import { withRateLimit } from "@/lib/rate-limit";
import {
  evaluateExistingTarget,
  evaluateRoleAssignment,
  isOwnerMembershipRole,
  isProtectedTeamRole,
  policyResponseBody,
  requireTeamPermission,
  resolveBuiltInRoleTarget,
  resolveTeamAccess,
} from "@/lib/team-access";

/** Safely extract message and code from an unknown error */
function getErrorInfo(e: unknown): { message: string; code: string } {
  if (e && typeof e === "object") {
    const message = "message" in e && typeof (e as Record<string, unknown>).message === "string" ? (e as Record<string, unknown>).message as string : String(e);
    const code = "code" in e && typeof (e as Record<string, unknown>).code === "string" ? (e as Record<string, unknown>).code as string : "";
    return { message, code };
  }
  return { message: String(e), code: "" };
}

/** Type for org with included subscription relation (used for team limit check) */
type OrgWithSubscription = {
  id: string; name: string; email: string | null; slug: string; logo: string | null;
  website: string | null; phone: string | null; plan: string; currency: string; timezone: string;
  subscription: { plan: { teamLimit: number; name: string } } | null;
};

async function findPublicTeamMembers(organizationId: string) {
  const rows = await db.organizationMember.findMany({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      role: true,
      roleId: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
      roleDef: {
        select: {
          id: true,
          name: true,
          label: true,
          description: true,
          level: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
    take: 100,
  });

  // Keep this explicit projection even though Prisma already applies select.
  // It prevents an accidental future query expansion from leaking PIN hashes,
  // penalties, or other private membership fields through the API response.
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    role: row.role,
    roleId: row.roleId,
    joinedAt: row.joinedAt,
    user: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
    },
    roleDef: row.roleDef ? {
      id: row.roleDef.id,
      name: row.roleDef.name,
      label: row.roleDef.label,
      description: row.roleDef.description,
      level: row.roleDef.level,
    } : null,
  }));
}

async function findPublicPendingInvitations(organizationId: string) {
  const rows = await db.teamInvitation.findMany({
    where: { organizationId, status: "pending" },
    select: {
      id: true,
      inviteeEmail: true,
      inviteeName: true,
      role: true,
      status: true,
      invitedAt: true,
      expiresAt: true,
    },
    orderBy: { invitedAt: "desc" },
    take: 100,
  });

  // Never return the bcrypt PIN hash. The plaintext PIN is shown once in the
  // authorized POST response and cannot be recovered from a pending record.
  return rows.map((row) => ({
    id: row.id,
    inviteeEmail: row.inviteeEmail,
    inviteeName: row.inviteeName,
    role: row.role,
    status: row.status,
    invitedAt: row.invitedAt,
    expiresAt: row.expiresAt,
  }));
}

/**
 * POST /api/team - Add a team member via PIN-based invitation
 *
 * Flow: Owner creates PIN → sends email invitation via mailto:
 * Team member receives PIN → logs in at portal with email + PIN
 */

export const GET = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] GET request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId || "";
    const access = await resolveTeamAccess(authCtx, orgId);
    const permission = requireTeamPermission(access, "team_view");
    if (!permission.allowed) {
      return NextResponse.json(policyResponseBody(permission), { status: permission.status });
    }

    let members: Awaited<ReturnType<typeof findPublicTeamMembers>> = [];
    let pendingInvitations: Awaited<ReturnType<typeof findPublicPendingInvitations>> = [];
    let teamLimit = 3;

    try {
      members = await withRetry(async () => {
        return findPublicTeamMembers(orgId);
      }, 2, 500);
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch members:", { error: getErrorInfo(e).message });
    }

    if (access.canManage) {
      try {
        pendingInvitations = await withRetry(async () => {
          return findPublicPendingInvitations(orgId);
        }, 2, 500);
      } catch (e: unknown) {
        logger.warn("[Team] Failed to fetch invitations:", { error: getErrorInfo(e).message });
      }
    }

    try {
      const org = await withRetry(async () => {
        return db.organization.findUnique({
          where: { id: orgId },
          include: { subscription: { include: { plan: true } } },
        });
      }, 2, 500);
      if (org?.subscription?.plan) {
        teamLimit = org.subscription.plan.teamLimit;
      }
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch org plan:", { error: getErrorInfo(e).message });
    }

    return NextResponse.json({ members, pendingInvitations, teamLimit, currentCount: members.length });
  } catch (error: unknown) {
    logger.error("Team API error:", error);
    // Always return 200 with empty data — never crash the UserManagement page
    return NextResponse.json({ members: [], pendingInvitations: [], teamLimit: 3, currentCount: 0, fallback: true });
  }
}, { requireOrg: false }), { maxRequests: 60, windowSeconds: 60 });

export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] POST request", { userId: authCtx.userId });
    // Phase 3: Zod validation for team invitation body
    const teamInviteSchema = z.object({
      organizationId: z.string().min(1),
      email: z.string().email().max(254),
      name: z.string().max(100).optional(),
      role: z.string().min(1).max(50),
      pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
    });
    const bodyResult = await validateBody(req, teamInviteSchema);
    if (!bodyResult.success) return bodyResult.response;
    const { organizationId, email, name, role, pin } = bodyResult.data;

    const access = await resolveTeamAccess(authCtx, organizationId);
    const managePermission = requireTeamPermission(access, "team_manage");
    if (!managePermission.allowed) {
      return NextResponse.json(policyResponseBody(managePermission), { status: managePermission.status });
    }

    const normalizedTargetRole = role.toLowerCase().trim();
    if (isProtectedTeamRole(normalizedTargetRole)) {
      return NextResponse.json({
        error: "Platform and legacy privileged roles cannot be assigned through organization endpoints",
        code: "PLATFORM_ROLE_BLOCKED",
      }, { status: 403 });
    }
    const roleTarget = resolveBuiltInRoleTarget(normalizedTargetRole);
    if (!roleTarget) {
      return NextResponse.json(
        { error: "Invalid or non-assignable role", code: "INVALID_ROLE" },
        { status: 403 },
      );
    }
    const assignment = evaluateRoleAssignment(access, roleTarget);
    if (!assignment.allowed) {
      return NextResponse.json(policyResponseBody(assignment), { status: assignment.status });
    }

    // ── Fetch Platform Identity ──
    let platformName = "Valtriox";
    try {
      const platformSettings = await db.platformSettings.findFirst();
      platformName = platformSettings?.companyName || "Valtriox";
    } catch (e: unknown) {
      logger.warn("[Team] platformSettings fetch failed, using default:", { error: getErrorInfo(e).message });
    }

    if (!organizationId || !email || !role) {
      return NextResponse.json({ error: "Missing required fields: organizationId, email, role" }, { status: 400 });
    }

    // ── Team Limit Check ──
    let org: OrgWithSubscription | null = null;
    try {
      org = await db.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: { include: { plan: true } } },
      });
    } catch (e: unknown) {
      const { message: errMsg } = getErrorInfo(e);
      logger.error("[Team] Failed to fetch organization:", { error: errMsg });
      return NextResponse.json({ error: "Failed to fetch organization details. Please try again.", _step: "fetch_org", _details: undefined }, { status: 500 });
    }

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let teamLimit = 3;
    if (org.subscription?.plan) {
      teamLimit = org.subscription.plan.teamLimit;
    }

    // Count current members (excluding platform roles)
    const currentMemberCount = await db.organizationMember.count({
      where: { organizationId },
    });

    // Count pending invitations
    const pendingInviteCount = await db.teamInvitation.count({
      where: { organizationId, status: "pending" },
    });

    const totalUsed = currentMemberCount + pendingInviteCount;

    if (!access.isPlatform && teamLimit !== -1 && totalUsed >= teamLimit) {
      return NextResponse.json({
        error: `Team member limit reached! Your ${org.subscription?.plan?.name || "Starter"} plan allows ${teamLimit} team members. Upgrade your plan to add more members.`,
        code: "TEAM_LIMIT_REACHED",
        teamLimit,
        currentCount: currentMemberCount,
        pendingCount: pendingInviteCount,
      }, { status: 403 });
    }

    // ── Validate PIN ──
    const userPin = (pin || "").trim();
    if (!/^\d{6}$/.test(userPin)) {
      return NextResponse.json({
        error: "PIN must be exactly 6 digits",
        code: "INVALID_PIN",
      }, { status: 400 });
    }

    const targetRole = roleTarget.name;

    const inviteeName = name || email.split("@")[0];
    let inviter: Awaited<ReturnType<typeof db.user.findUnique>> | null;
    try {
      inviter = await db.user.findUnique({ where: { id: authCtx.userId } });
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch inviter (non-critical):", { error: getErrorInfo(e).message });
      inviter = null;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

    const hashedPin = await bcrypt.hash(userPin, 10);

    const normalizedEmail = sanitizeEmail(email);
    const transactionResult = await db.$transaction(async (tx) => {
      const currentAccess = await resolveTeamAccess(authCtx, organizationId, tx);
      const currentPermission = requireTeamPermission(currentAccess, "team_manage");
      if (!currentPermission.allowed) {
        throw Object.assign(new Error(currentPermission.reason), { code: currentPermission.code });
      }
      const currentAssignment = evaluateRoleAssignment(currentAccess, roleTarget);
      if (!currentAssignment.allowed) {
        throw Object.assign(new Error(currentAssignment.reason), { code: currentAssignment.code });
      }

      const currentOrg = await tx.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: { include: { plan: true } } },
      });
      if (!currentOrg || !currentOrg.isActive || currentOrg.isBanned) {
        throw Object.assign(new Error("Organization is not active"), { code: "ORGANIZATION_UNAVAILABLE" });
      }
      const currentTeamLimit = currentOrg.subscription?.plan?.teamLimit ?? 3;
      const currentMemberCountInTx = await tx.organizationMember.count({ where: { organizationId } });
      const currentPendingCountInTx = await tx.teamInvitation.count({
        where: { organizationId, status: "pending" },
      });
      if (
        !currentAccess.isPlatform &&
        currentTeamLimit !== -1 &&
        currentMemberCountInTx + currentPendingCountInTx >= currentTeamLimit
      ) {
        throw Object.assign(new Error("Team member limit reached"), { code: "TEAM_LIMIT_REACHED" });
      }

      let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (user) {
        const existingMembership = await tx.organizationMember.findFirst({
          where: { organizationId, userId: user.id },
          select: { id: true },
        });
        if (existingMembership) {
          throw Object.assign(new Error("User is already a member of this organization"), {
            code: "TEAM_MEMBER_EXISTS",
          });
        }
      }

      const existingInvitation = await tx.teamInvitation.findFirst({
        where: { organizationId, inviteeEmail: normalizedEmail, status: "pending" },
        select: { id: true },
      });
      if (existingInvitation) {
        throw Object.assign(new Error("An invitation is already pending for this email"), {
          code: "PENDING_INVITATION_EXISTS",
        });
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            name: inviteeName,
            email: normalizedEmail,
            password: null,
            role: targetRole,
          },
        });
      }

      const createdMember = await tx.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: targetRole,
          pin: hashedPin,
          pinCreatedAt: new Date(),
        },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          roleId: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
      const createdInvitation = await tx.teamInvitation.create({
        data: {
          organizationId,
          inviterId: authCtx.userId,
          inviteeEmail: normalizedEmail,
          inviteeName,
          role: targetRole,
          pin: hashedPin,
          status: "accepted",
          expiresAt,
        },
      });
      return {
        member: createdMember,
        invitation: createdInvitation,
        teamLimit: currentTeamLimit,
        currentCount: currentMemberCountInTx + 1,
        pendingCount: currentPendingCountInTx,
      };
    }, { isolationLevel: "Serializable" });
    const { member, invitation } = transactionResult;

    // Get role label
    let roleLabel = targetRole;
    try {
      const roleDef = getRoleByName(targetRole);
      roleLabel = roleDef?.label || targetRole;
    } catch (e: unknown) {
      logger.warn("[Team] Failed to get role label (non-critical):", { error: getErrorInfo(e).message });
    }
    const orgName = org.name || platformName;
    const inviterName = inviter?.name || "Admin";
    const portalUrl = process.env.NEXTAUTH_URL || "https://valtriox-portal.vercel.app";

    return NextResponse.json({
      member,
      invitation: {
        id: invitation.id,
        email: email.toLowerCase(),
        name: inviteeName,
        role: roleLabel,
        pin: userPin,
        expiresAt: expiresAt.toISOString(),
      },
      teamLimit: transactionResult.teamLimit,
      currentCount: transactionResult.currentCount,
      pendingCount: transactionResult.pendingCount,
      // Email compose data for mailto: link
      emailData: {
        to: email.toLowerCase(),
        from: inviter?.email || org.email || "",
        subject: `You're Invited to Join ${orgName} on ${platformName}`,
        body: `Dear ${inviteeName},\n\nYou have been invited by ${inviterName} to join ${orgName} on ${platformName} - Pakistan's #1 Business Management Portal.\n\nYour Role: ${roleLabel}\nYour Login PIN: ${userPin}\n\nHow to Access:\n1. Go to ${portalUrl}\n2. Enter your email: ${email.toLowerCase()}\n3. Select "PIN Login"\n4. Enter your PIN: ${userPin}\n5. You're in!\n\nThis invitation expires on ${expiresAt.toLocaleDateString()}.\n\nFor any help, contact support through the portal.\n\nBest regards,\n${inviterName}\n${orgName} - Powered by ${platformName}`,
      },
      message: `Team member ${inviteeName} invited successfully! Share the PIN securely via email.`,
    }, { status: 201 });
  } catch (error: unknown) {
    const errorInfo = getErrorInfo(error);
    logger.error("Team POST error", error, { organizationId: authCtx?.organizationId });
    if (isDbUnavailable(error)) {
      return NextResponse.json({ error: "Database is currently unavailable. Please try again later.", fallback: true }, { status: 503 });
    }
    if (errorInfo.code === "PENDING_INVITATION_EXISTS") {
      return NextResponse.json({ error: errorInfo.message }, { status: 400 });
    }
    if (errorInfo.code === "TEAM_MEMBER_EXISTS" || errorInfo.code === "P2002") {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }
    if ([
      "TEAM_PERMISSION_DENIED",
      "PENALTY_ACTIVE",
      "ORGANIZATION_UNAVAILABLE",
      "ROLE_HIERARCHY_VIOLATION",
      "BRAND_OWNER_ROLE_LIMIT",
      "BRAND_ADMIN_ROLE_LIMIT",
      "TEAM_LIMIT_REACHED",
    ].includes(errorInfo.code)) {
      return NextResponse.json({ error: errorInfo.message, code: errorInfo.code }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}, { requireOrg: false }), { maxRequests: 10, windowSeconds: 60 });

// DELETE - Remove a team member OR revoke a pending invitation
export const DELETE = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] DELETE request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const invitationId = searchParams.get("invitationId");

    if ((!memberId && !invitationId) || (memberId && invitationId)) {
      return NextResponse.json(
        { error: "Provide exactly one of memberId or invitationId", code: "INVALID_DELETE_TARGET" },
        { status: 400 },
      );
    }

    // ── Revoke pending invitation ──
    if (invitationId) {
      const invitation = await db.teamInvitation.findUnique({
        where: { id: invitationId },
        select: { id: true, organizationId: true, status: true },
      });
      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }
      const access = await resolveTeamAccess(authCtx, invitation.organizationId);
      const permission = requireTeamPermission(access, "team_manage");
      if (!permission.allowed) {
        return NextResponse.json(policyResponseBody(permission), { status: permission.status });
      }
      if (invitation.status !== "pending") {
        return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
      }
      await db.$transaction(async (tx) => {
        const current = await tx.teamInvitation.findUnique({
          where: { id: invitationId },
          select: { id: true, organizationId: true, status: true },
        });
        if (!current || current.organizationId !== invitation.organizationId || current.status !== "pending") {
          throw Object.assign(new Error("Invitation is no longer pending"), { code: "INVITATION_CHANGED" });
        }
        const currentAccess = await resolveTeamAccess(authCtx, current.organizationId, tx);
        const currentPermission = requireTeamPermission(currentAccess, "team_manage");
        if (!currentPermission.allowed) {
          throw Object.assign(new Error(currentPermission.reason), { code: currentPermission.code });
        }
        const update = await tx.teamInvitation.updateMany({
          where: { id: invitationId, status: "pending" },
          data: { status: "revoked" },
        });
        if (update.count !== 1) {
          throw Object.assign(new Error("Invitation is no longer pending"), { code: "INVITATION_CHANGED" });
        }
      }, { isolationLevel: "Serializable" });
      return NextResponse.json({ success: true, message: "Invitation revoked successfully" });
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "Member id is required", code: "INVALID_DELETE_TARGET" },
        { status: 400 },
      );
    }

    const member = await db.organizationMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
        roleDef: { select: { name: true, level: true } },
        user: { select: { email: true } },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    const access = await resolveTeamAccess(authCtx, member.organizationId);
    const permission = requireTeamPermission(access, "team_manage");
    if (!permission.allowed) {
      return NextResponse.json(policyResponseBody(permission), { status: permission.status });
    }
    if (member.userId === authCtx.userId) {
      return NextResponse.json(
        { error: "You cannot remove your own membership", code: "SELF_MUTATION_BLOCKED" },
        { status: 403 },
      );
    }
    const targetPolicy = evaluateExistingTarget(access, member);
    if (!targetPolicy.allowed) {
      return NextResponse.json(policyResponseBody(targetPolicy), { status: targetPolicy.status });
    }

    await db.$transaction(async (tx) => {
      const current = await tx.organizationMember.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          roleDef: { select: { name: true, level: true } },
          user: { select: { email: true } },
        },
      });
      if (!current || current.organizationId !== member.organizationId) {
        throw Object.assign(new Error("Team member changed during removal"), { code: "TEAM_MEMBER_CHANGED" });
      }
      if (current.userId === authCtx.userId) {
        throw Object.assign(new Error("You cannot remove your own membership"), { code: "SELF_MUTATION_BLOCKED" });
      }
      const currentAccess = await resolveTeamAccess(authCtx, current.organizationId, tx);
      const currentPermission = requireTeamPermission(currentAccess, "team_manage");
      if (!currentPermission.allowed) {
        throw Object.assign(new Error(currentPermission.reason), { code: currentPermission.code });
      }
      const currentTargetPolicy = evaluateExistingTarget(currentAccess, current);
      if (!currentTargetPolicy.allowed) {
        throw Object.assign(new Error(currentTargetPolicy.reason), { code: currentTargetPolicy.code });
      }
      if (isOwnerMembershipRole(current.role)) {
        const ownerCount = await tx.organizationMember.count({
          where: {
            organizationId: current.organizationId,
            role: { in: ["brand_owner", "owner", "ceo"], mode: "insensitive" },
          },
        });
        if (ownerCount <= 1) {
          throw Object.assign(new Error("An organization must keep at least one brand owner"), {
            code: "LAST_OWNER_REQUIRED",
          });
        }
      }

      await tx.teamInvitation.updateMany({
        where: {
          organizationId: current.organizationId,
          inviteeEmail: current.user.email.toLowerCase(),
          status: "pending",
        },
        data: { status: "revoked" },
      });
      await tx.organizationMember.delete({ where: { id: memberId } });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error: unknown) {
    const errorInfo = getErrorInfo(error);
    logger.error("Team DELETE error", error);
    if (isDbUnavailable(error)) {
      return NextResponse.json({ error: "Database is currently unavailable. Please try again later.", fallback: true }, { status: 503 });
    }
    if ([
      "TEAM_PERMISSION_DENIED",
      "PENALTY_ACTIVE",
      "ORGANIZATION_UNAVAILABLE",
      "SELF_MUTATION_BLOCKED",
      "LAST_OWNER_REQUIRED",
      "PLATFORM_ROLE_BLOCKED",
      "TARGET_ROLE_HIERARCHY",
    ].includes(errorInfo.code)) {
      return NextResponse.json({ error: errorInfo.message, code: errorInfo.code }, { status: 403 });
    }
    if (["TEAM_MEMBER_CHANGED", "INVITATION_CHANGED"].includes(errorInfo.code)) {
      return NextResponse.json({ error: errorInfo.message, code: errorInfo.code }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}, { requireOrg: false }), { maxRequests: 30, windowSeconds: 60 });
