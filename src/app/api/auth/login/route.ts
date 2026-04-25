import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeEmail } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * Helper to create a login response with auth cookies.
 * These cookies are read by Next.js middleware to inject auth headers
 * into all subsequent API requests.
 */
function createLoginResponse(userData: any, orgData: any) {
  const response = NextResponse.json({ user: userData, organization: orgData });
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  const cookieOptions = {
    path: "/",
    maxAge,
    httpOnly: false, // Needed for client-side reads
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  if (userData) {
    response.cookies.set("vt-user-id", userData.id, cookieOptions);
    response.cookies.set("vt-user-email", userData.email || "", cookieOptions);
    response.cookies.set("vt-user-role", userData.role || "member", cookieOptions);
  }
  if (orgData) {
    response.cookies.set("vt-org-id", orgData.id, cookieOptions);
  }
  return response;
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const { email, password, pin, loginType } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const isPinLogin = loginType === "pin";

    if (!isPinLogin && !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (isPinLogin && !pin) {
      return NextResponse.json({ error: "Email and PIN are required" }, { status: 400 });
    }

    // Check if database is reachable
    let user;
    try {
      user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { organization: { include: { organization: true } } },
      });
    } catch (dbErr: any) {
      const errMsg = dbErr?.message || String(dbErr);
      console.error("Database connection error:", errMsg);
      if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('user:password')) {
        return NextResponse.json(
          { error: "Database not configured.", code: "DB_NOT_CONFIGURED" },
          { status: 503 }
        );
      }
      if (errMsg.includes('relation') || errMsg.includes('does not exist') || errMsg.includes('column')) {
        return NextResponse.json(
          { error: "Database schema needs update.", code: "SCHEMA_MISMATCH" },
          { status: 503 }
        );
      }
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('timeout') || errMsg.includes('connect')) {
        return NextResponse.json(
          { error: "Cannot connect to database.", code: "DB_CONNECTION_FAILED" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Database connection failed.", code: "DB_ERROR", details: errMsg },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });
    }

    // PIN login for team members
    if (isPinLogin) {
      if (!user.organization || user.organization.length === 0) {
        return NextResponse.json({ error: "You are not a member of any organization." }, { status: 401 });
      }

      const membership = user.organization[0];
      if (!membership.pin) {
        return NextResponse.json({ error: "No PIN set for your account. Contact your team admin." }, { status: 401 });
      }

      // Compare hashed PIN (support both plain-text for migration and bcrypt hashes)
      let isPinValid = false;
      if (membership.pin && membership.pin.startsWith("$2")) {
        // bcrypt hash — use compare
        isPinValid = await bcrypt.compare(pin, membership.pin);
      } else {
        // Legacy plain-text PIN — compare directly then upgrade to hash
        isPinValid = membership.pin === pin;
        if (isPinValid) {
          // Upgrade to bcrypt hash in background
          const hashedPin = await bcrypt.hash(pin, 10);
          await db.organizationMember.update({
            where: { id: membership.id },
            data: { pin: hashedPin },
          }).catch(() => { /* non-critical */ });
          logger.info("Legacy PIN upgraded to bcrypt hash", { userId: user.id });
        }
      }

      if (!isPinValid) {
        logger.warn("Invalid PIN login attempt", { email: email.toLowerCase() });
        return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
      }

      // Check penalty
      if (membership.penaltyUntil && new Date(membership.penaltyUntil) > new Date()) {
        return NextResponse.json({
          error: "Your access has been restricted due to 3 consecutive absences. Contact your team admin.",
          code: "PENALTY_ACTIVE",
          penaltyUntil: membership.penaltyUntil.toISOString(),
        }, { status: 403 });
      }

      const org = membership.organization;

      // Mark invitation as accepted (first PIN login)
      if (membership.pinCreatedAt) {
        try {
          await db.teamInvitation.updateMany({
            where: {
              organizationId: membership.organizationId,
              inviteeEmail: user.email.toLowerCase(),
              status: "pending",
            },
            data: { status: "accepted", acceptedAt: new Date() },
          });

          // Create notification for the organization owner
          const ownerMember = await db.organizationMember.findFirst({
            where: { organizationId: membership.organizationId, role: { in: ["brand_owner", "owner", "platform_owner"] } },
            include: { user: { select: { id: true } } },
          });
          if (ownerMember) {
            await db.notification.create({
              data: {
                organizationId: membership.organizationId,
                userId: ownerMember.userId,
                type: "team_access_granted",
                title: "Team Member Accepted Invitation",
                message: `${user.name} (${user.email}) has accepted your invitation and joined ${org?.name || "your brand"} as ${membership.role || "team member"}.`,
              },
            });
          }
        } catch (notifErr: any) {
          console.error("Failed to create notification:", notifErr?.message);
        }
      }

      return createLoginResponse(
        {
          id: user.id, name: user.name, email: user.email, image: user.image,
          role: membership.role || user.role, loginType: "pin",
        },
        org ? {
          id: org.id, name: org.name, slug: org.slug, logo: org.logo,
          website: org.website, phone: org.phone, email: org.email,
          currency: org.currency, timezone: org.timezone, plan: org.plan,
          workingHoursStart: org.workingHoursStart, workingHoursEnd: org.workingHoursEnd,
        } : null
      );
    }

    // Password login for brand owners / admin
    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses PIN login. Please use PIN to sign in." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const membership = user.organization[0];
    const org = membership?.organization;

    return createLoginResponse(
      {
        id: user.id, name: user.name, email: user.email, image: user.image,
        role: membership?.role || user.role, loginType: "password",
      },
      org ? {
        id: org.id, name: org.name, slug: org.slug, logo: org.logo,
        website: org.website, phone: org.phone, email: org.email,
        currency: org.currency, timezone: org.timezone, plan: org.plan,
        workingHoursStart: org.workingHoursStart, workingHoursEnd: org.workingHoursEnd,
      } : null
    );
  } catch (err: any) {
    logger.error("Login error", err, { email });
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}, { maxRequests: 5, windowSeconds: 60 });
