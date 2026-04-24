// ============================================================================
// Rate Limiting Middleware
// ============================================================================
// Simple in-memory rate limiter for API routes.
// In production, use Redis or Upstash for distributed rate limiting.
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Maximum number of requests in the window */
  maxRequests?: number;
  /** Time window in seconds */
  windowSeconds?: number;
  /** Custom identifier (defaults to IP) */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check if a request is within rate limits.
 *
 * Usage in API routes:
 *   import { rateLimit } from "@/lib/rate-limit";
 *
 *   export async function POST(req: NextRequest) {
 *     const { success, remaining } = rateLimit(req, { maxRequests: 5, windowSeconds: 60 });
 *     if (!success) {
 *       return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
 *     }
 *     // ... handle request
 *   }
 */
export function rateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { maxRequests = 10, windowSeconds = 60, identifier } = options;
  const key = identifier || getClientIp(req);
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Create new window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newEntry);
    return { success: true, remaining: maxRequests - 1, resetAt: newEntry.resetAt, limit: maxRequests };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt, limit: maxRequests };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt, limit: maxRequests };
}

/**
 * withRateLimit — Higher-order function wrapper for rate limiting API routes.
 *
 * Usage:
 *   export const POST = withRateLimit(handler, { maxRequests: 5, windowSeconds: 60 });
 */
type Handler = (req: NextRequest) => Promise<Response> | Response;

export function withRateLimit(
  handler: Handler,
  options: RateLimitOptions = {}
): (req: NextRequest) => Promise<Response> {
  return async (req: NextRequest): Promise<Response> => {
    const result = rateLimit(req, options);
    if (!result.success) {
      const response = NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      return response;
    }

    const response = await handler(req);
    if (response instanceof Response) {
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Limit", String(result.limit));
    }
    return response;
  };
}

/**
 * Get client IP from request headers
 */
function getClientIp(req: NextRequest): string {
  // Common proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Fallback to a hash of the request to prevent tracking
  return "unknown-" + Date.now();
}

// Export for testing
export { getClientIp };
