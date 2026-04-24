import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Allowed origins for CORS — add your production domains here
const ALLOWED_ORIGINS = [
  // Development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  // Production — add your actual domains
  // "https://yourdomain.com",
  // "https://app.yourdomain.com",
  // Vercel preview deployments
  /^https:\/\/brandflow-portal.*\.vercel\.app$/,
  /^https:\/\/.*-ashirraza313.*\.vercel\.app$/,
];

/**
 * Check if an origin is allowed.
 */
function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some((allowed) => {
    if (allowed instanceof RegExp) return allowed.test(origin);
    return allowed === origin;
  });
}

// Rate limiting for API routes
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const clientIp = getClientIp(request);
  const { pathname } = request.nextUrl;

  // ── CORS ──
  const responseHeaders = new Headers();

  if (origin && isAllowedOrigin(origin)) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-User-Role, X-Org-Id, X-User-Email");
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
    responseHeaders.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24h
  }

  // ── Security Headers ──
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "DENY");
  responseHeaders.set("X-XSS-Protection", "1; mode=block");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  responseHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // ── Rate Limiting (per IP) ──
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          },
        }
      );
    }
    responseHeaders.set("X-RateLimit-Remaining", String(RATE_LIMIT_MAX - entry.count));
    responseHeaders.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  }

  // ── Auth Cookie → Header Injection ──
  // Reads auth cookies (set by login API) and injects them as request headers.
  // CRITICAL: In Next.js middleware, request.headers.set() does NOT propagate
  // to route handlers. We MUST use NextResponse.next({ request: { headers } })
  // to forward modified request headers.
  let requestHeaders: Headers | undefined;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/legal/")) {
    const userId = request.cookies.get("bf-user-id")?.value;
    if (userId) {
      const userEmail = request.cookies.get("bf-user-email")?.value;
      const userRole = request.cookies.get("bf-user-role")?.value;
      const orgId = request.cookies.get("bf-org-id")?.value;

      requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", userId);
      requestHeaders.set("x-user-email", userEmail || "");
      requestHeaders.set("x-user-role", userRole || "member");
      requestHeaders.set("x-org-id", orgId || "");
    }
  }

  // Forward with modified request headers + response headers
  return NextResponse.next({
    headers: responseHeaders,
    request: requestHeaders ? { headers: requestHeaders } : undefined,
  });
}

// Clean up rate limit store periodically
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

export const config = {
  matcher: "/api/:path*",
};
