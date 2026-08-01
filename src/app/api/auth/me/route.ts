import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-middleware";
import { db, isDbUnavailable, withRetry } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUTH_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Vary: "Cookie",
};

function authResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: AUTH_RESPONSE_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  try {
    const authCtx = await getAuthContext(req);
    if (!authCtx) {
      return authResponse({ user: null, organization: null }, 401);
    }

    // Fetch fresh user/org data
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: authCtx.userId },
        select: { id: true, name: true, email: true, image: true, role: true },
      });
    }, 2, 500);

    if (!user) {
      return authResponse({ user: null, organization: null }, 401);
    }

    // Check if user is a Valtriox team member → override role to "valtriox_team"
    const vtMember = await withRetry(async () => {
      return await db.valtrioxTeamMember.findFirst({
        where: { userId: authCtx.userId, status: "active" },
      });
    }, 2, 500);

    let organization: Record<string, unknown> | null = null;
    let membershipRole: string | null = null;
    if (authCtx.organizationId) {
      const membership = await withRetry(async () => {
        return await db.organizationMember.findFirst({
          where: {
            organizationId: authCtx.organizationId,
            userId: authCtx.userId,
          },
          include: {
            organization: {
              select: {
                id: true, name: true, slug: true, logo: true, website: true,
                phone: true, email: true, currency: true, timezone: true,
                plan: true, workingHoursStart: true, workingHoursEnd: true,
                isActive: true, isBanned: true,
              },
            },
          },
        });
      }, 2, 500);
      organization = membership?.organization || null;
      membershipRole = membership?.role || null;
    }

    // Keep reload/session hydration consistent with the login endpoint: an
    // organization membership role takes precedence, while active Valtriox
    // team membership remains the highest-priority platform override.
    const effectiveRole = vtMember ? "valtriox_team" : membershipRole || user.role;
    let visibleSections: string[] | undefined;
    if (vtMember) {
      try {
        const parsed = JSON.parse(String(vtMember.visibleSections || "[]"));
        visibleSections = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
      } catch {
        visibleSections = [];
      }
    }

    const sessionUser = {
      ...user,
      role: effectiveRole,
      ...(visibleSections ? { visibleSections } : {}),
    };

    // Platform-level roles bypass starter-plan restrictions in the UI.
    const isPlatformLevel = effectiveRole === "platform_owner" || effectiveRole === "platform_admin" || effectiveRole === "valtriox_team";
    if (isPlatformLevel && organization && organization.plan === "starter") {
      organization.plan = "enterprise";
    }

    return authResponse({ user: sessionUser, organization });
  } catch (error) {
    const databaseUnavailable = isDbUnavailable(error);
    console.error("[Auth] Session verification failed:", error);
    return authResponse(
      {
        error: databaseUnavailable
          ? "Session service temporarily unavailable"
          : "Session verification failed",
        code: databaseUnavailable ? "AUTH_SERVICE_UNAVAILABLE" : "AUTH_VERIFICATION_FAILED",
      },
      databaseUnavailable ? 503 : 500
    );
  }
}
