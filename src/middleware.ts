import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Phase 4+5: CORS + security headers + request correlation middleware
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "https://valtriox.com",
  "https://www.valtriox.com",
  "https://valtriox-portal.vercel.app",
].filter(Boolean) as string[];

// Generate a cryptographically random nonce for CSP
function generateNonce(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export function middleware(request: NextRequest) {
  // ── SEO: WWW Canonicalization ──────────────────────────────────────────
  // Rank Math flagged: "The www and non-www versions of the URL are not
  // redirected to the same site." Without this redirect, Google may index
  // both versions separately, splitting PageRank and diluting rankings.
  // We canonicalize on the non-www apex domain (https://valtriox.com) with a
  // 301 permanent redirect so all link equity consolidates on one host.
  // The redirect preserves the path + query string and only fires in
  // production (next dev often runs on localhost / vercel.app).
  const host = request.headers.get("host") || "";
  if (process.env.NODE_ENV === "production" && host === "www.valtriox.com") {
    const url = request.nextUrl.clone();
    url.host = "valtriox.com";
    url.protocol = "https:";
    const redirect = NextResponse.redirect(url, 301);
    // Preserve security headers on the redirect itself
    redirect.headers.set("X-Content-Type-Options", "nosniff");
    redirect.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (process.env.NODE_ENV === "production") {
      redirect.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }
    return redirect;
  }

  const origin = request.headers.get("origin");

  // Phase 7: Generate nonce for CSP inline script/style allowlist
  const nonce = generateNonce();

  // Phase 5: Generate request correlation ID for tracing
  const requestId = request.headers.get("X-Request-ID") || crypto.randomUUID();

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("X-Request-ID", requestId);

    return response;
  }

  // Use NextResponse.next() with headers to pass nonce to RSC/SSR
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("X-Request-ID", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set CORS headers for allowed origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Phase 5: Propagate request ID for end-to-end tracing
  response.headers.set("X-Request-ID", requestId);

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // SECURITY: Strict-Transport-Security — enforce HTTPS for 1 year + subdomains
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // SECURITY: Content-Security-Policy — defense-in-depth against XSS
  // Phase 7: Nonce-based CSP — every request gets a unique nonce that allows
  // only our legitimate inline scripts (Next.js hydration, Meta Pixel, GA, etc.)
  // to execute. This is MORE secure than 'unsafe-inline' because:
  //   1. Attackers cannot inject scripts without the nonce
  //   2. The nonce changes per request, preventing replay attacks
  //   3. Only server-rendered scripts with the correct nonce execute
  //
  // 'strict-dynamic' allows scripts loaded by trusted scripts to also run,
  // which handles third-party script chains (e.g., Facebook Pixel loading sub-scripts).
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://connect.facebook.net https://www.googletagmanager.com`,
        // style-src uses 'unsafe-inline' (NOT nonce) because Next.js 16 + React 19 +
        // Framer Motion + Tailwind inject inline style attributes and <style> tags that
        // cannot all carry the nonce. This is the standard Next.js CSP pattern:
        // nonce for scripts (security-critical), unsafe-inline for styles (low XSS risk).
        // Using nonce here causes React #418 hydration errors + broken animations.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: https://www.facebook.com",
        "connect-src 'self' https://va.vercel-scripts.com https://*.supabase.co https://api.cloudinary.com https://api.resend.com https://www.facebook.com https://www.google-analytics.com https://graph.facebook.com",
        "frame-src https://www.facebook.com https://calendly.com https://*.calendly.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; ")
    );
  }

  // SECURITY: Permissions-Policy — restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|assets/|downloads/|sw.js|manifest.json|robots.txt|valtriox-.*\\.png).*)",
  ],
};
