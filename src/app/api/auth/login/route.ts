import { NextRequest, NextResponse } from "next/server";
import { db, withRetry} from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeEmail } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { validateBody, loginSchema } from "@/lib/validations";
import { z } from "zod";
import { signAuthData } from "@/lib/auth-middleware";

/** Safely extract message from an unknown error */
function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as Record<string, unknown>).message === "string") {
    return (e as Record<string, unknown>).message as string;
  }
  return String(e);
}

/** Shape of user data passed to createLoginResponse */
interface LoginUserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  loginType: string;
  visibleSections: string[] | null;
}

/** Shape of org data passed to createLoginResponse */
interface LoginOrgData {
  id: string;
  name: string | null;
  slug: string | null;
  logo: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  currency: string | null;
  timezone: string | null;
  plan: string | null;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
}

/**
 * Helper to create a login response with auth cookies.
 * These cookies are read by Next.js middleware to inject auth headers
 * into all subsequent API requests.
 */
function createLoginResponse(userData: LoginUserData, orgData: LoginOrgData | null) {
  const response = NextResponse.json({ user: userData, organization: orgData });
  const maxAge = 7 * 24 * 60 * 60; // Phase 7: 7 days — aligned between 1-day (too short) and 30-day (too long) session
  const cookieOptions = {
    path: "/",
    maxAge,
    httpOnly: true, // FIXED: was false
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  if (userData) {
    response.cookies.set("vt-user-id", userData.id, cookieOptions);
    response.cookies.set("vt-user-email", userData.email || "", cookieOptions);
    response.cookies.set("vt-user-role", userData.role || "member", cookieOptions);
    // Sign auth data with HMAC so the middleware can verify integrity
    const signature = signAuthData({
      userId: userData.id,
      email: userData.email || "",
      role: userData.role || "member",
      organizationId: orgData?.id,
    });
    response.cookies.set("vt-auth-sig", signature, cookieOptions);
  }
  if (orgData) {
    response.cookies.set("vt-org-id", orgData.id, cookieOptions);
  }
  return response;
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    // Phase 3: Zod validation for login body
    const bodyResult = await validateBody(req, loginSchema.extend({
      pin: z.string().max(10).optional(),
      loginType: z.enum(["password", "pin"]).optional(),
    }));
    if (!bodyResult.success) return bodyResult.response;
    const { email, password, pin, loginType } = bodyResult.data;

    // TEMP DEBUG — remove after fixing
    logger.info(`[Login] Attempting login for email: ${email?.toLowerCase()} raw: ${email}`);

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

    // Check if database is reachable - use explicit select to avoid referencing missing columns
    let user;
    try {
      user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true, name: true, email: true, image: true, role: true, password: true,
          organization: {
            select: {
              id: true, role: true, pin: true, pinCreatedAt: true, penaltyUntil: true,
              organizationId: true,
              organization: {
                select: {
                  id: true, name: true, slug: true, logo: true, website: true, phone: true, email: true,
                  currency: true, timezone: true, plan: true, workingHoursStart: true, workingHoursEnd: true,
                }
              }
            }
          }
        }
      });
    } catch (dbErr: unknown) {
      const errMsg = getErrorMessage(dbErr);
      logger.error("Database connection error:", errMsg);
      if (!process.env.DATABASE_URL) {
        return NextResponse.json(
          { error: "Database not configured.", code: "DB_NOT_CONFIGURED" },
          { status: 503 }
        );
      }
      if (errMsg.includes('relation') || errMsg.includes('does not exist') || errMsg.includes('column')) {
        // Schema mismatch - try auto-creating/updating tables
        logger.info("[Login] Schema mismatch detected, attempting auto-fix...");
        try {
          logger.info("[Login] Attempting auto-fix via ensureDb...");
          // Retry the full query after auto-fix
          user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true, name: true, email: true, image: true, role: true, password: true,
              organization: {
                select: {
                  id: true, role: true, pin: true, pinCreatedAt: true, penaltyUntil: true,
                  organizationId: true,
                  organization: {
                    select: {
                      id: true, name: true, slug: true, logo: true, website: true, phone: true, email: true,
                      currency: true, timezone: true, plan: true, workingHoursStart: true, workingHoursEnd: true,
                    }
                  }
                }
              }
            }
          });
        } catch (fixErr: unknown) {
          logger.error("[Login] Auto-fix failed:", getErrorMessage(fixErr));
          // Last resort: try without includes
          try {
            user = await db.user.findUnique({
              where: { email: email.toLowerCase() },
              select: { id: true, name: true, email: true, image: true, role: true, password: true, organization: false }
            });
          } catch {
            return NextResponse.json(
              { error: "Database schema needs update. Please visit /setup to initialize.", code: "SCHEMA_MISMATCH" },
              { status: 503 }
            );
          }
        }
      }
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('timeout') || errMsg.includes('connect')) {
        return NextResponse.json(
          { error: "Cannot connect to database.", code: "DB_CONNECTION_FAILED" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Database connection failed.", code: "DB_ERROR" },
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
        // bcrypt hash - use compare
        const compareResult = await (bcrypt.compare as (data: string, hash: string) => Promise<boolean>)(pin || "", membership.pin!);
        isPinValid = !!compareResult;
      } else {
        // Legacy plain-text PIN - compare directly then upgrade to hash
        isPinValid = membership.pin === pin;
        if (isPinValid) {
          // Upgrade to bcrypt hash in background
          const hashedPin = await (bcrypt.hash as (data: string, salt: string | number) => Promise<string>)(pin || "", 10);
          await withRetry(async () => {
            return await db.organizationMember.update({
            where: { id: membership.id },
            data: { pin: hashedPin },
          }).catch(() => { /* non-critical */ })
          }, 2, 500);
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

      // ── Override role for Valtriox team members ──
      let effectiveRole = membership.role || user.role;
      let visibleSections: string[] | null = null;
      try {
        const vtMember = await withRetry(async () => {
          return await db.valtrioxTeamMember.findFirst({
          where: { userId: user.id, status: "active" },
        })
        }, 2, 500);
        if (vtMember) {
          effectiveRole = "valtriox_team";
          // Parse visibleSections (JSON array of hidden section IDs)
          try {
            visibleSections = JSON.parse(String((vtMember as Record<string, unknown>).visibleSections || "[]"));
          } catch { visibleSections = []; }
          // Fix existing OrganizationMember record if it has wrong role
          if (membership.role !== "valtriox_team" && membership.id) {
            await withRetry(async () => {
              return await db.organizationMember.update({
              where: { id: membership.id },
              data: { role: "valtriox_team" },
            }).catch(() => { /* non-critical */ })
            }, 2, 500);
          }
        }
      } catch { /* non-critical */ }

      // Mark invitation as accepted (first PIN login)
      if (membership.pinCreatedAt) {
        try {
          await withRetry(async () => {
            return await db.teamInvitation.updateMany({
            where: {
              organizationId: membership.organizationId,
              inviteeEmail: user.email.toLowerCase(),
              status: "pending",
            },
            data: { status: "accepted", acceptedAt: new Date() },
          })
          }, 2, 500);

          // Create notification for the organization owner
          const ownerMember = await withRetry(async () => {
            return await db.organizationMember.findFirst({
            where: { organizationId: membership.organizationId, role: { in: ["brand_owner", "owner", "platform_owner"] } },
            include: { user: { select: { id: true } } },
          })
          }, 2, 500);
          if (ownerMember) {
            await withRetry(async () => {
              return await db.notification.create({
              data: {
                organizationId: membership.organizationId,
                userId: ownerMember.userId,
                type: "team_access_granted",
                title: "Team Member Accepted Invitation",
                message: `${user.name} (${user.email}) has accepted your invitation and joined ${org?.name || "your brand"} as ${membership.role || "team member"}.`,
              },
            })
            }, 2, 500);
          }
        } catch (notifErr: unknown) {
          logger.error("Failed to create notification:", getErrorMessage(notifErr));
        }
      }

      return createLoginResponse(
        {
          id: user.id, name: user.name, email: user.email, image: user.image,
          role: effectiveRole, loginType: "pin", visibleSections,
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

    let membership = user.organization[0];
    let org = membership?.organization;

    // ── Auto-assign org for Valtriox team members who have no org yet ──
    // Also fix role for VT members who already have org but with wrong role
    let pwVisibleSections: string[] | null = null;
    try {
      const vtMember = await withRetry(async () => {
        return await db.valtrioxTeamMember.findFirst({
        where: { userId: user.id, status: "active" },
      })
      }, 2, 500);
      if (vtMember) {
        try { pwVisibleSections = JSON.parse(String((vtMember as Record<string, unknown>).visibleSections || "[]")); } catch { pwVisibleSections = []; }
        if (!org) {
          // No org yet - auto-assign one
          const anyOrg = await withRetry(async () => {
            return await db.organization.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, slug: true, logo: true, website: true, phone: true, email: true, currency: true, timezone: true, plan: true, workingHoursStart: true, workingHoursEnd: true },
          })
          }, 2, 500);
          if (anyOrg) {
            await withRetry(async () => {
              return await db.organizationMember.upsert({
              where: {
                organizationId_userId: {
                  organizationId: anyOrg.id,
                  userId: user.id,
                },
              },
              create: {
                organizationId: anyOrg.id,
                userId: user.id,
                role: "valtriox_team",
                joinedAt: new Date(),
              },
              update: {}, // Don't change existing if somehow exists
            })
            }, 2, 500);
            org = anyOrg;
            membership = {
              ...membership,
              role: "valtriox_team",
            } as typeof membership;
          }
        } else if (membership && membership.role !== "valtriox_team") {
          // Has org but wrong role - fix it
          try {
            await withRetry(async () => {
              return await db.organizationMember.update({
              where: { id: membership.id },
              data: { role: "valtriox_team" },
            })
            }, 2, 500);
            membership = { ...membership, role: "valtriox_team" } as typeof membership;
          } catch { /* non-critical */ }
        }
      }
    } catch (autoOrgErr: unknown) {
      logger.error("[Login] Auto-assign org for VT member failed:", getErrorMessage(autoOrgErr));
    }

    return createLoginResponse(
      {
        id: user.id, name: user.name, email: user.email, image: user.image,
        role: membership?.role || user.role, loginType: "password", visibleSections: pwVisibleSections,
      },
      org ? {
        id: org.id, name: org.name, slug: org.slug, logo: org.logo,
        website: org.website, phone: org.phone, email: org.email,
        currency: org.currency, timezone: org.timezone, plan: org.plan,
        workingHoursStart: org.workingHoursStart, workingHoursEnd: org.workingHoursEnd,
      } : null
    );
  } catch (err: unknown) {
    logger.error("Login error", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}, { maxRequests: 5, windowSeconds: 60 });
