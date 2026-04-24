import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isPlatformRole,
  isOrgAdmin,
  getAuthContext,
  withAuth,
  AuthContext,
} from "@/lib/auth-middleware";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => {
      return new Response(JSON.stringify(body), {
        status: init?.status || 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock @/lib/auth
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create a mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  };
}

// Helper to create a valid Bearer token (base64 JSON)
function createBearerToken(payload: Record<string, unknown>): string {
  return "Bearer " + Buffer.from(JSON.stringify(payload)).toString("base64");
}

// =============================================================================
// isPlatformRole
// =============================================================================
describe("isPlatformRole", () => {
  it("returns true for platform_owner", () => {
    expect(isPlatformRole("platform_owner")).toBe(true);
  });

  it("returns true for platform_admin", () => {
    expect(isPlatformRole("platform_admin")).toBe(true);
  });

  it("returns true for owner", () => {
    expect(isPlatformRole("owner")).toBe(true);
  });

  it("returns false for regular member", () => {
    expect(isPlatformRole("member")).toBe(false);
  });

  it("returns false for brand_owner", () => {
    expect(isPlatformRole("brand_owner")).toBe(false);
  });

  it("returns false for manager", () => {
    expect(isPlatformRole("manager")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isPlatformRole("")).toBe(false);
  });
});

// =============================================================================
// isOrgAdmin
// =============================================================================
describe("isOrgAdmin", () => {
  it("returns true for platform_owner", () => {
    expect(isOrgAdmin("platform_owner")).toBe(true);
  });

  it("returns true for platform_admin", () => {
    expect(isOrgAdmin("platform_admin")).toBe(true);
  });

  it("returns true for owner", () => {
    expect(isOrgAdmin("owner")).toBe(true);
  });

  it("returns true for brand_owner", () => {
    expect(isOrgAdmin("brand_owner")).toBe(true);
  });

  it("returns true for manager", () => {
    expect(isOrgAdmin("manager")).toBe(true);
  });

  it("returns false for regular member", () => {
    expect(isOrgAdmin("member")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isOrgAdmin("")).toBe(false);
  });
});

// =============================================================================
// getAuthContext
// =============================================================================
describe("getAuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no auth is present", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({});
    const result = await getAuthContext(req);
    expect(result).toBeNull();
  });

  it("returns AuthContext from NextAuth session", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-123",
        email: "test@example.com",
        role: "admin",
        organizationId: "org-456",
      },
    });
    const req = createMockRequest({});
    const result = await getAuthContext(req);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-123");
    expect(result!.email).toBe("test@example.com");
    expect(result!.role).toBe("admin");
    expect(result!.organizationId).toBe("org-456");
  });

  it("defaults role to 'member' when not in session", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@test.com",
      },
    });
    const req = createMockRequest({});
    const result = await getAuthContext(req);
    expect(result!.role).toBe("member");
  });

  it("returns AuthContext from valid Bearer token", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const token = createBearerToken({
      userId: "tok-user-1",
      email: "token@test.com",
      role: "brand_owner",
      organizationId: "tok-org-1",
    });
    const req = createMockRequest({ authorization: token });
    const result = await getAuthContext(req);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("tok-user-1");
    expect(result!.email).toBe("token@test.com");
    expect(result!.role).toBe("brand_owner");
    expect(result!.organizationId).toBe("tok-org-1");
  });

  it("returns null for invalid Bearer token (not base64 JSON)", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({ authorization: "Bearer not-valid-base64!!!" });
    const result = await getAuthContext(req);
    expect(result).toBeNull();
  });

  it("returns null for Bearer token missing userId", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const token = createBearerToken({ email: "test@test.com" });
    const req = createMockRequest({ authorization: token });
    const result = await getAuthContext(req);
    expect(result).toBeNull();
  });

  it("returns null for Bearer token missing email", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const token = createBearerToken({ userId: "user-1" });
    const req = createMockRequest({ authorization: token });
    const result = await getAuthContext(req);
    expect(result).toBeNull();
  });

  it("returns AuthContext from x-user-id header", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({
      "x-user-id": "header-user-1",
      "x-user-email": "header@test.com",
      "x-user-role": "manager",
      "x-org-id": "header-org-1",
    });
    const result = await getAuthContext(req);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("header-user-1");
    expect(result!.email).toBe("header@test.com");
    expect(result!.role).toBe("manager");
    expect(result!.organizationId).toBe("header-org-1");
  });

  it("defaults role to 'member' when x-user-role is missing", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({ "x-user-id": "user-1" });
    const result = await getAuthContext(req);
    expect(result!.role).toBe("member");
  });

  it("returns empty email when x-user-email is missing", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({ "x-user-id": "user-1" });
    const result = await getAuthContext(req);
    expect(result!.email).toBe("");
  });

  it("prefers NextAuth session over Bearer token", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: "session-user", email: "session@test.com" },
    });
    const token = createBearerToken({
      userId: "token-user",
      email: "token@test.com",
    });
    const req = createMockRequest({ authorization: token });
    const result = await getAuthContext(req);

    expect(result!.userId).toBe("session-user");
  });

  it("prefers Bearer token over x-user-id header", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const token = createBearerToken({
      userId: "bearer-user",
      email: "bearer@test.com",
    });
    const req = createMockRequest({
      authorization: token,
      "x-user-id": "header-user",
    });
    const result = await getAuthContext(req);
    expect(result!.userId).toBe("bearer-user");
  });
});

// =============================================================================
// withAuth
// =============================================================================
describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authentication is present", async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Authentication required");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when user has wrong role", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "member",
        organizationId: "org-1",
      },
    });
    const handler = vi.fn();
    const wrapped = withAuth(handler, { requireRole: ["admin", "owner"] });
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Insufficient permissions");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when no orgId and requireOrg is true (default)", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "member",
        // no organizationId
      },
    });
    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Organization context required");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes auth context to handler when auth succeeds", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "admin",
        organizationId: "org-1",
      },
    });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler);
    const req = createMockRequest({});

    await wrapped(req);
    expect(handler).toHaveBeenCalledOnce();
    // First arg should be req, second should be AuthContext
    const authCtx = handler.mock.calls[0][1] as AuthContext;
    expect(authCtx.userId).toBe("user-1");
    expect(authCtx.role).toBe("admin");
    expect(authCtx.organizationId).toBe("org-1");
  });

  it("skips auth check when allowPublic is true", async () => {
    const handler = vi.fn().mockResolvedValue(new Response("public ok"));
    const wrapped = withAuth(handler, { allowPublic: true });
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();

    // Verify public context
    const authCtx = handler.mock.calls[0][1] as AuthContext;
    expect(authCtx.userId).toBe("public");
    expect(authCtx.role).toBe("public");
    expect(authCtx.email).toBe("");
  });

  it("allows request when user has correct role", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "admin",
        organizationId: "org-1",
      },
    });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler, { requireRole: ["admin", "owner"] });
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not require orgId when requireOrg is false", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "member",
        // no organizationId
      },
    });
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler, { requireOrg: false });
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 500 when handler throws an unexpected error", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@test.com",
        role: "admin",
        organizationId: "org-1",
      },
    });
    const handler = vi.fn().mockImplementation(() => {
      throw new Error("Handler crashed");
    });
    const wrapped = withAuth(handler);
    const req = createMockRequest({});

    const response = await wrapped(req);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Internal server error");
    expect(handler).toHaveBeenCalledOnce();
  });
});
