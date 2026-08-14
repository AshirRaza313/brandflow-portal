import { NextRequest, NextResponse } from "next/server";
import { db, isDbUnavailable, withRetry } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeEmail, sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody, inviteTeamMemberSchema } from "@/lib/validations";
import { z } from "zod";
import { getAdminEmail } from "@/lib/roles";
import { withRateLimit } from "@/lib/rate-limit";

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

/**
 * POST /api/team - Add a team member via PIN-based invitation
 *
 * Flow: Owner creates PIN → sends email invitation via mailto:
 * Team member receives PIN → logs in at portal with email + PIN
 */

// Role levels for hierarchy enforcement
const ROLE_LEVELS: Record<string, number> = {
  platform_owner: 100,
  platform_admin: 95,
  platform_engineer: 85,
  platform_support: 85,
  platform_sales: 85,
  platform_marketing: 85,
  brand_owner: 90,
  brand_admin: 80,
  operations_manager: 70,
  sales_manager: 65,
  marketing_manager: 65,
  warehouse_manager: 60,
  accountant: 55,
  team_lead: 55,
  support_agent: 50,
  content_creator: 45,
  sales_rep: 40,
  inventory_clerk: 35,
  viewer: 20,
  custom: 0,
  owner: 90,
  admin: 80,
  manager: 70,
  member: 20,
  ceo: 90,
};

const PLATFORM_ONLY_ROLES = ["platform_owner", "platform_admin", "owner", "platform_engineer", "platform_support", "platform_sales", "platform_marketing"];
const BRAND_OWNER_MAX_LEVEL = 80;
const BRAND_ADMIN_MAX_LEVEL = 60;

export const GET = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] GET request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId!;

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let members: Awaited<ReturnType<typeof db.organizationMember.findMany>> = [];
    let pendingInvitations: Awaited<ReturnType<typeof db.teamInvitation.findMany>> = [];
    let teamLimit = 3;

    try {
      members = await withRetry(async () => {
        return db.organizationMember.findMany({
          where: { organizationId: orgId },
          include: {
            user: { select: { id: true, name: true, email: true, image: true, role: true } },
            roleDef: { select: { id: true, name: true, label: true, description: true, level: true, permissions: true } },
          },
          orderBy: { joinedAt: "asc" },
      take: 100,
        });
      }, 2, 500);
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch members:", { error: getErrorInfo(e).message });
    }

    try {
      pendingInvitations = await withRetry(async () => {
        return db.teamInvitation.findMany({
          where: { organizationId: orgId, status: "pending" },
          orderBy: { invitedAt: "desc" },
      take: 100,
        });
      }, 2, 500);
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch invitations:", { error: getErrorInfo(e).message });
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
}), { maxRequests: 60, windowSeconds: 60 });

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
      invitedBy: z.string().optional(),
    });
    const bodyResult = await validateBody(req, teamInviteSchema);
    if (!bodyResult.success) return bodyResult.response;
    const { organizationId, email, name, role, pin, invitedBy } = bodyResult.data;

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

    // Security: verify organizationId matches auth context
    // Platform admins (platform_owner, platform_admin) can invite to any org
    const platformAdminRoles = ["platform_owner", "platform_admin", "owner"];
    const isPlatformAdmin = platformAdminRoles.includes(authCtx.role);
    if (!isPlatformAdmin && organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

    // Platform admin/owner bypasses team limit (isPlatformAdmin already defined above)
    const adminEmail = getAdminEmail();
    const isAdminByEmail = adminEmail && authCtx.email?.toLowerCase() === adminEmail;

    if (!isPlatformAdmin && !isAdminByEmail && teamLimit !== -1 && totalUsed >= teamLimit) {
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

    // ── Role Hierarchy Enforcement ──
    const targetRole = role.toLowerCase().trim();
    const targetLevel = ROLE_LEVELS[targetRole] ?? -1;

    if (PLATFORM_ONLY_ROLES.includes(targetRole)) {
      return NextResponse.json({
        error: `Access denied. Platform-level roles can only be assigned by the ${platformName} platform owner.`,
        code: "PLATFORM_ROLE_BLOCKED",
      }, { status: 403 });
    }

    if (invitedBy) {
      const inviterUser = await db.user.findUnique({
        where: { id: invitedBy },
        select: { email: true, role: true },
      });

      if (inviterUser) {
        const inviterRole = inviterUser.role.toLowerCase();
        const inviterLevel = ROLE_LEVELS[inviterRole] ?? 0;
        const adminEmail = getAdminEmail();
        const isPlatformOwner = adminEmail && inviterUser.email.toLowerCase() === adminEmail;

        if (!isPlatformOwner) {
          if (targetLevel >= inviterLevel) {
            return NextResponse.json({
              error: `Access denied. You cannot assign a role (${targetRole}) equal to or higher than your own (${inviterRole}).`,
              code: "ROLE_HIERARCHY_VIOLATION",
            }, { status: 403 });
          }
          if (inviterRole === "brand_owner" || inviterRole === "owner" || inviterRole === "ceo") {
            if (targetLevel >= BRAND_OWNER_MAX_LEVEL) {
              return NextResponse.json({
                error: `Access denied. Brand owners can only assign team member roles. Cannot assign ${targetRole}.`,
                code: "BRAND_OWNER_ROLE_LIMIT",
              }, { status: 403 });
            }
          }
          if (inviterRole === "brand_admin" || inviterRole === "admin") {
            if (targetLevel >= BRAND_ADMIN_MAX_LEVEL) {
              return NextResponse.json({
                error: `Access denied. Brand admins can only assign roles below their level. Cannot assign ${targetRole}.`,
                code: "BRAND_ADMIN_ROLE_LIMIT",
              }, { status: 403 });
            }
          }
        }
      }
    }

    // ── Check if already a member ──
    let existingUser: Awaited<ReturnType<typeof db.user.findUnique>>;
    try {
      existingUser = await db.user.findUnique({
        where: { email: sanitizeEmail(email) },
      });
    } catch (e: unknown) {
      const { message: errMsg } = getErrorInfo(e);
      logger.error("[Team] Failed to check existing user:", { error: errMsg });
      return NextResponse.json({ error: "Database error while checking user. Please try again.", _step: "check_user", _details: undefined }, { status: 500 });
    }

    if (existingUser) {
      try {
        const existingMembership = await db.organizationMember.findFirst({
          where: { organizationId, userId: existingUser.id },
        });
        if (existingMembership) {
          logger.warn("Duplicate membership attempt", { email: sanitizeEmail(email), organizationId });
          return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
        }
      } catch (e: unknown) {
        const { message: errMsg } = getErrorInfo(e);
        logger.error("[Team] Failed to check membership:", { error: errMsg });
        return NextResponse.json({ error: "Database error while checking membership. Please try again.", _step: "check_membership", _details: undefined }, { status: 500 });
      }
    }

    // Check if there's already a pending invitation for this email
    try {
      const existingInvitation = await db.teamInvitation.findFirst({
        where: { organizationId, inviteeEmail: sanitizeEmail(email), status: "pending" },
      });
      if (existingInvitation) {
        return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 400 });
      }
    } catch (e: unknown) {
      const { message: errMsg } = getErrorInfo(e);
      logger.error("[Team] Failed to check invitation:", { error: errMsg });
      return NextResponse.json({ error: "Database error while checking invitations. Please try again.", _step: "check_invitation", _details: undefined }, { status: 500 });
    }

    // ── Create User (if doesn't exist) + OrganizationMember + Invitation ──
    const inviteeName = name || email.split("@")[0];
    let inviter: Awaited<ReturnType<typeof db.user.findUnique>> | null;
    try {
      inviter = invitedBy ? await db.user.findUnique({ where: { id: invitedBy } }) : null;
    } catch (e: unknown) {
      logger.warn("[Team] Failed to fetch inviter (non-critical):", { error: getErrorInfo(e).message });
      inviter = null;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

    // Create user without password if not exists
    let user = existingUser;
    if (!user) {
      try {
        user = await db.user.create({
          data: {
            name: inviteeName,
            email: sanitizeEmail(email),
            password: null,
            role: targetRole,
          },
        });
        logger.info("New user created for team invitation", { userId: user.id, email: sanitizeEmail(email), role: targetRole });
      } catch (e: unknown) {
        const { message: errMsg, code: errCode } = getErrorInfo(e);
        logger.error("[Team] Failed to create user:", { error: errMsg });
        return NextResponse.json({ error: "Failed to create user account. Please try again.", _step: "create_user", _details: undefined, _code: undefined }, { status: 500 });
      }
    }

    // Hash PIN before storing (bcrypt)
    const hashedPin = await bcrypt.hash(userPin, 10);

    // Create OrganizationMember with hashed PIN
    let member: Awaited<ReturnType<typeof db.organizationMember.create>>;
    try {
      member = await db.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: targetRole,
          pin: hashedPin,
          pinCreatedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } catch (e: unknown) {
      const { message: errMsg, code: errCode } = getErrorInfo(e);
      logger.error("[Team] Failed to create organization member:", { error: errMsg, code: errCode });
      return NextResponse.json({ error: "Failed to add team member. Please try again.", _step: "create_member", _details: undefined, _code: undefined }, { status: 500 });
    }

    // Create invitation record — mark as "accepted" immediately since the member
    // is added to the team right away (avoids "fake" pending invitations in UI)
    let invitation: Awaited<ReturnType<typeof db.teamInvitation.create>> | { id: string; pin: string };
    try {
      invitation = await db.teamInvitation.create({
        data: {
          organizationId,
          inviterId: invitedBy || user.id,
          inviteeEmail: sanitizeEmail(email),
          inviteeName,
          role: targetRole,
          pin: hashedPin,
          status: "accepted",
          expiresAt,
        },
      });
    } catch (e: unknown) {
      const { message: errMsg, code: errCode } = getErrorInfo(e);
      logger.error("[Team] Failed to create invitation record:", { error: errMsg, code: errCode });
      // Member was already created — keep it, invitation record is non-critical
      invitation = { id: "temp", pin: hashedPin };
    }

    // Get role label
    let roleLabel = targetRole;
    try {
      const { getRoleByName } = await import("@/lib/roles");
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
      teamLimit,
      currentCount: currentMemberCount + 1,
      pendingCount: pendingInviteCount + 1,
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
    const { message: errMsg, code: errCode } = getErrorInfo(error);
    logger.error("Team POST error", error, { organizationId: authCtx?.organizationId });
    if (isDbUnavailable(error)) {
      return NextResponse.json({ error: "Database is currently unavailable. Please try again later.", fallback: true }, { status: 503 });
    }
    if (errCode === 'P2002') {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}), { maxRequests: 10, windowSeconds: 60 });

// DELETE - Remove a team member OR revoke a pending invitation
export const DELETE = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] DELETE request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const invitationId = searchParams.get("invitationId");

    // ── Revoke pending invitation ──
    if (invitationId && !memberId) {
      const invitation = await db.teamInvitation.findUnique({ where: { id: invitationId } });
      if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
      }
      if (invitation.organizationId !== authCtx.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (invitation.status !== "pending") {
        return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
      }
      await db.teamInvitation.update({
        where: { id: invitationId },
        data: { status: "revoked" },
      });
      return NextResponse.json({ success: true, message: "Invitation revoked successfully" });
    }

    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

    // Also revoke any pending invitations for this member
    const member = await db.organizationMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });

    if (member) {
      // Security: verify member belongs to user's org
      if (member.organizationId !== authCtx.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      // Revoke invitations for this user in this org
      await db.teamInvitation.updateMany({
        where: {
          organizationId: member.organizationId,
          inviteeEmail: member.user.email.toLowerCase(),
          status: "pending",
        },
        data: { status: "revoked" },
      });
    }

    await db.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error: unknown) {
    logger.error("Team DELETE error", error);
    if (isDbUnavailable(error)) {
      return NextResponse.json({ error: "Database is currently unavailable. Please try again later.", fallback: true }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
