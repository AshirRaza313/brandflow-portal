import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeEmail, sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withAuth } from "@/lib/auth-middleware";

/**
 * POST /api/team — Add a team member via PIN-based invitation
 *
 * Flow: Owner creates PIN → sends email invitation via mailto:
 * Team member receives PIN → logs in at portal with email + PIN
 */

// Role levels for hierarchy enforcement
const ROLE_LEVELS: Record<string, number> = {
  platform_owner: 100,
  platform_admin: 95,
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

const PLATFORM_ONLY_ROLES = ["platform_owner", "platform_admin", "owner"];
const BRAND_OWNER_MAX_LEVEL = 80;
const BRAND_ADMIN_MAX_LEVEL = 60;

export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId!;

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Also fetch pending invitations
    const pendingInvitations = await db.teamInvitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      orderBy: { invitedAt: "desc" },
    });

    // Get team limit from subscription plan
    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: { subscription: { include: { plan: true } } },
    });

    let teamLimit = 3; // default
    if (org?.subscription?.plan) {
      teamLimit = org.subscription.plan.teamLimit;
    }

    return NextResponse.json({ members, pendingInvitations, teamLimit, currentCount: members.length });
  } catch (error: any) {
    console.error("Team API error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] POST request", { userId: authCtx.userId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { organizationId, email, name, role, pin, invitedBy } = body;

    // ── Fetch Platform Identity ──
    const platformSettings = await db.platformSettings.findFirst();
    const platformName = platformSettings?.companyName || "BrandFlow";

    if (!organizationId || !email || !role) {
      return NextResponse.json({ error: "Missing required fields: organizationId, email, role" }, { status: 400 });
    }

    // Security: verify organizationId matches auth context
    if (organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Team Limit Check ──
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: { include: { plan: true } } },
    });

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

    if (teamLimit !== -1 && totalUsed >= teamLimit) {
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
        const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
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
    const existingUser = await db.user.findUnique({
      where: { email: sanitizeEmail(email) },
    });

    if (existingUser) {
      const existingMembership = await db.organizationMember.findFirst({
        where: { organizationId, userId: existingUser.id },
      });
      if (existingMembership) {
        logger.warn("Duplicate membership attempt", { email: sanitizeEmail(email), organizationId });
        return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
      }
      if (existingMembership) {
        return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
      }
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await db.teamInvitation.findFirst({
      where: { organizationId, inviteeEmail: sanitizeEmail(email), status: "pending" },
    });
    if (existingInvitation) {
      return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 400 });
    }

    // ── Create User (if doesn't exist) + OrganizationMember + Invitation ──
    const inviteeName = name || email.split("@")[0];
    const inviter = invitedBy ? await db.user.findUnique({ where: { id: invitedBy } }) : null;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

    // Create user without password if not exists
    let user = existingUser;
    if (!user) {
      user = await db.user.create({
        data: {
          name: inviteeName,
          email: sanitizeEmail(email),
          password: null,
          role: targetRole,
        },
      });
      logger.info("New user created for team invitation", { userId: user.id, email: sanitizeEmail(email), role: targetRole });
    }

    // Hash PIN before storing (bcrypt)
    const hashedPin = await bcrypt.hash(userPin, 10);

    // Create OrganizationMember with hashed PIN
    const member = await db.organizationMember.create({
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

    // Create invitation record (store hashed PIN)
    const invitation = await db.teamInvitation.create({
      data: {
        organizationId,
        inviterId: invitedBy || user.id,
        inviteeEmail: sanitizeEmail(email),
        inviteeName,
        role: targetRole,
        pin: hashedPin,
        status: "pending",
        expiresAt,
      },
    });

    // Get role label
    const { getRoleByName } = await import("@/lib/roles");
    const roleDef = getRoleByName(targetRole);
    const roleLabel = roleDef?.label || targetRole;
    const orgName = org.name || platformName;
    const inviterName = inviter?.name || "Admin";
    const portalUrl = process.env.NEXTAUTH_URL || "https://brandflow-portal.vercel.app";

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
        body: `Dear ${inviteeName},\n\nYou have been invited by ${inviterName} to join ${orgName} on ${platformName} — Pakistan's #1 Business Management Portal.\n\nYour Role: ${roleLabel}\nYour Login PIN: ${userPin}\n\nHow to Access:\n1. Go to ${portalUrl}\n2. Enter your email: ${email.toLowerCase()}\n3. Select "PIN Login"\n4. Enter your PIN: ${userPin}\n5. You're in!\n\nThis invitation expires on ${expiresAt.toLocaleDateString()}.\n\nFor any help, contact support through the portal.\n\nBest regards,\n${inviterName}\n${orgName} — Powered by ${platformName}`,
      },
      message: `Team member ${inviteeName} invited successfully! Share the PIN securely via email.`,
    }, { status: 201 });
  } catch (error: any) {
    logger.error("Team POST error", error, { organizationId, email: body?.email });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
});

// DELETE — Remove a team member
export const DELETE = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Team] DELETE request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

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
  } catch (error: any) {
    logger.error("Team DELETE error", error, { memberId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
});
