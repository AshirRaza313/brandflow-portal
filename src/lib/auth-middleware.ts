// ============================================================================
// API Authentication Middleware
// ============================================================================
// Every protected API route should wrap its handler with `withAuth()`.
// This validates that a valid session exists (via NextAuth or custom token).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
}

/**
 * Extract auth context from request.
 * Tries multiple auth sources in order of reliability.
 * Each method is independently try-caught so one failure doesn't block others.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // ── Method 1: NextAuth session ──
  // Wrapped in its own try-catch so a NextAuth failure (missing NEXTAUTH_SECRET,
  // misconfigured provider, etc.) does NOT prevent fallback auth methods.
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const user = session.user as any;
      if (user?.id) {
        return {
          userId: user.id,
          email: user.email || "",
          role: user.role || "member",
          organizationId: user.organizationId,
        };
      }
    }
  } catch (nextAuthErr: any) {
    // NextAuth failed — log but DON'T abort. Fall through to other auth methods.
    console.warn("[Auth] NextAuth session check failed, falling back to header auth:", nextAuthErr?.message || nextAuthErr);
  }

  // ── Method 2: Authorization header (Bearer token) ──
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (decoded?.userId && decoded?.email) {
        return {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role || "member",
          organizationId: decoded.organizationId,
        };
      }
    }
  } catch {
    // Bearer token invalid — continue to next method
  }

  // ── Method 3: Custom headers (set by Next.js middleware from cookies) ──
  // This is the primary auth flow for the BrandOnyx Portal:
  // Login API → sets cookies → middleware reads cookies → injects x-user-* headers
  const userId = req.headers.get("x-user-id");
  if (userId) {
    return {
      userId,
      email: req.headers.get("x-user-email") || "",
      role: req.headers.get("x-user-role") || "member",
      organizationId: req.headers.get("x-org-id") || undefined,
    };
  }

  return null;
}

/**
 * withAuth — Higher-order function that wraps API route handlers with authentication.
 *
 * Usage:
 *   export const GET = withAuth(async (req, ctx) => {
 *     // ctx.userId, ctx.role, ctx.organizationId are available
 *     return NextResponse.json({ data: "protected" });
 *   });
 *
 * Options:
 *   - requireRole: string[] — Only allow specific roles (e.g., ["platform_owner", "admin"])
 *   - requireOrg: boolean — Require organizationId to be present (default: true)
 *   - allowPublic: boolean — Skip auth check entirely (default: false)
 */
export type RouteContext = { params: Promise<Record<string, string>> };
type ApiHandler = (req: NextRequest, authCtx: AuthContext, context: RouteContext) => Promise<Response> | Response;

interface WithAuthOptions {
  requireRole?: string[];
  requireOrg?: boolean;
  allowPublic?: boolean;
}

export function withAuth(handler: ApiHandler, options: WithAuthOptions = {}) {
  const { requireRole = [], requireOrg = true, allowPublic = false } = options;

  return async (req: NextRequest, context?: RouteContext): Promise<Response> => {
    const ctx = context ?? { params: Promise.resolve({}) };
    try {
      // Public routes skip auth
      if (allowPublic) {
        const publicCtx: AuthContext = {
          userId: "public",
          email: "",
          role: "public",
        };
        return handler(req, publicCtx, ctx);
      }

      const authCtx = await getAuthContext(req);

      if (!authCtx) {
        return NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        );
      }

      // Role check
      if (requireRole.length > 0 && !requireRole.includes(authCtx.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions. You don't have access to this resource." },
          { status: 403 }
        );
      }

      // Organization check — auto-bypass for platform-level roles (admin/owner)
      // Platform owners don't need to belong to a specific organization.
      const isPlatformAdmin = isPlatformRole(authCtx.role);
      if (requireOrg && !authCtx.organizationId && !isPlatformAdmin) {
        return NextResponse.json(
          { error: "Organization context required. Please join or create an organization." },
          { status: 403 }
        );
      }

      return handler(req, authCtx, ctx);
    } catch (error: any) {
      console.error("[Auth Middleware Error]", error?.message || error);
      return NextResponse.json(
        { error: "Internal server error during authentication." },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to check if the user has a platform-level role (bypasses feature locks)
 */
export function isPlatformRole(role: string): boolean {
  return ["platform_owner", "platform_admin", "owner"].includes(role);
}

/**
 * Utility to check if the user is a brand owner or higher
 */
export function isOrgAdmin(role: string): boolean {
  return ["platform_owner", "platform_admin", "owner", "brand_owner", "manager"].includes(role);
}
