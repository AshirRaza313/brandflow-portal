import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// rate-limit.ts uses NextResponse as a global (Next.js provides it)
// Mock it on globalThis before importing the module
const mockNextResponseJson = vi.fn();
vi.stubGlobal("NextResponse", { json: mockNextResponseJson });

import { rateLimit, withRateLimit, getClientIp } from "@/lib/rate-limit";

// Helper to create a mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  };
}

// Helper to create a NextResponse-like object with settable headers
function createMockResponse(body: unknown, init?: { status?: number }): any {
  const headerMap = new Map<string, string>();
  return {
    status: init?.status || 200,
    json: () => Promise.resolve(body),
    headers: {
      set: (name: string, value: string) => headerMap.set(name, value),
      get: (name: string) => headerMap.get(name) || null,
    },
  };
}

// =============================================================================
// getClientIp
// =============================================================================
describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header (first entry)", () => {
    const req = createMockRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from forwarded IP", () => {
    const req = createMockRequest({ "x-forwarded-for": "  1.2.3.4  " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = createMockRequest({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to cf-connecting-ip for Cloudflare", () => {
    const req = createMockRequest({ "cf-connecting-ip": "172.16.0.1" });
    expect(getClientIp(req)).toBe("172.16.0.1");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = createMockRequest({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("returns 'unknown-' + timestamp when no headers present", () => {
    const req = createMockRequest({});
    const ip = getClientIp(req);
    expect(ip).toMatch(/^unknown-\d+$/);
  });
});

// =============================================================================
// rateLimit
// =============================================================================
describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    const req = createMockRequest({ "x-real-ip": "10.0.0.1" });
    const result = rateLimit(req, { maxRequests: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it("allows requests up to the limit", () => {
    // Use unique IP to avoid store pollution from other tests
    const req = createMockRequest({ "x-real-ip": "10.0.1.1" });
    const opts = { maxRequests: 3, windowSeconds: 60 };

    expect(rateLimit(req, opts).success).toBe(true);
    expect(rateLimit(req, opts).success).toBe(true);
    expect(rateLimit(req, opts).success).toBe(true);
    expect(rateLimit(req, opts).success).toBe(false); // 4th is blocked
  });

  it("returns remaining: 0 and success: false when limit exceeded", () => {
    const req = createMockRequest({ "x-real-ip": "10.0.2.1" });
    const opts = { maxRequests: 2, windowSeconds: 60 };

    rateLimit(req, opts);
    rateLimit(req, opts);
    const result = rateLimit(req, opts);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets the window after time passes", () => {
    const req = createMockRequest({ "x-real-ip": "10.0.3.1" });
    const opts = { maxRequests: 1, windowSeconds: 60 };

    // Use up the limit
    const first = rateLimit(req, opts);
    expect(first.success).toBe(true);

    // Blocked
    expect(rateLimit(req, opts).success).toBe(false);

    // Advance time past window
    vi.advanceTimersByTime(61_000);

    // Should work again
    const afterReset = rateLimit(req, opts);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it("uses custom identifier when provided", () => {
    const req = createMockRequest({});
    const opts = { maxRequests: 1, windowSeconds: 60, identifier: "test-custom-id" };

    expect(rateLimit(req, opts).success).toBe(true);
    expect(rateLimit(req, opts).success).toBe(false);
  });

  it("tracks different clients independently", () => {
    const req1 = createMockRequest({ "x-real-ip": "10.1.1.1" });
    const req2 = createMockRequest({ "x-real-ip": "10.2.2.2" });
    const opts = { maxRequests: 1, windowSeconds: 60 };

    expect(rateLimit(req1, opts).success).toBe(true);
    expect(rateLimit(req1, opts).success).toBe(false);

    // Different IP should have its own quota
    expect(rateLimit(req2, opts).success).toBe(true);
  });

  it("uses default options (maxRequests: 10, windowSeconds: 60)", () => {
    const req = createMockRequest({ "x-real-ip": "10.0.4.1" });
    const result = rateLimit(req);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
  });
});

// =============================================================================
// withRateLimit
// =============================================================================
describe("withRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNextResponseJson.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the handler when within rate limit", async () => {
    const mockResponse = createMockResponse("ok", { status: 200 });
    mockNextResponseJson.mockReturnValue(mockResponse);

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 5, windowSeconds: 60 });
    const req = createMockRequest({ "x-real-ip": "10.10.0.1" });

    const response = await wrapped(req);
    expect(handler).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const mock429 = createMockResponse(
      { error: "Too many requests. Please try again later.", retryAfter: 60 },
      { status: 429 }
    );
    mockNextResponseJson.mockReturnValue(mock429);

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 1, windowSeconds: 60 });
    const req = createMockRequest({ "x-real-ip": "10.10.1.1" });

    // First call succeeds
    await wrapped(req);

    // Second call should be blocked
    const response = await wrapped(req);
    expect(response.status).toBe(429);
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Too many requests") }),
      expect.objectContaining({ status: 429 })
    );
  });

  it("sets X-RateLimit headers on successful response", async () => {
    const mockResponse = createMockResponse("ok", { status: 200 });
    mockNextResponseJson.mockReturnValue(mockResponse);

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 10, windowSeconds: 60 });
    const req = createMockRequest({ "x-real-ip": "10.10.2.1" });

    const response = await wrapped(req);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
  });

  it("sets X-RateLimit headers and Retry-After on 429 response", async () => {
    const mock429 = createMockResponse(
      { error: "Too many requests. Please try again later.", retryAfter: 60 },
      { status: 429 }
    );
    mockNextResponseJson.mockReturnValue(mock429);

    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withRateLimit(handler, { maxRequests: 1, windowSeconds: 60 });
    const req = createMockRequest({ "x-real-ip": "10.10.3.1" });

    await wrapped(req);
    const response = await wrapped(req);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });
});
