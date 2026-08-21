// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({
  organizationId: "org-a",
  authUserId: "user-a",
  authRole: "brand_owner",
  membership: null as null | {
    id: string;
    role: string;
    penaltyUntil: Date | null;
    roleDef: { name: string; permissions: string; level: number } | null;
  },
  vtm: null as null | { role: string; visibleSections?: string },
  target: null as null | {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    roleDef: { name: string; level: number } | null;
  },
  role: null as null | { id: string; name: string; level: number; permissions: string },
  ownerCount: 2,
  orgActive: true,
  orgBanned: false,
}));

const dbMocks = vi.hoisted(() => {
  const organization = {
    findUnique: vi.fn(async () => ({ id: "org-a", isActive: testState.orgActive, isBanned: testState.orgBanned })),
  };
  const organizationMember = {
    findFirst: vi.fn(async () => testState.membership),
    findUnique: vi.fn(async () => testState.target),
    count: vi.fn(async () => testState.ownerCount),
    update: vi.fn(async (args?: unknown) => {
      void args;
      return { id: "target-updated" };
    }),
  };
  const valtrioxTeamMember = { findFirst: vi.fn(async () => testState.vtm) };
  const role = { findUnique: vi.fn(async () => testState.role) };
  const db = { organization, organizationMember, valtrioxTeamMember, role, $transaction: vi.fn() };
  db.$transaction.mockImplementation(async (operation: (client: typeof db) => unknown) => operation(db));
  return { db, organizationMember, role, valtrioxTeamMember };
});

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: <T>(operation: () => T): T => operation(),
  isDbUnavailable: () => false,
  dbErrorResponse: () => new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 }),
}));
vi.mock("@/lib/auth-middleware", () => ({
  withAuth:
    (handler: (...args: unknown[]) => unknown) =>
    (req: NextRequest, context?: unknown) => handler(req, {
      userId: testState.authUserId,
      email: "owner@example.com",
      role: testState.authRole,
      organizationId: testState.organizationId,
    }, context),
}));
vi.mock("@/lib/rate-limit", () => ({ withRateLimit: (handler: (...args: unknown[]) => unknown) => handler }));
vi.mock("@/lib/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/validations/api", () => ({
  validateBody: async (req: NextRequest) => ({ success: true, data: await req.json() }),
}));
vi.mock("@/lib/validations/schemas", () => ({ updateMemberRoleApiSchema: {} }));

import { PUT } from "@/app/api/organization/members/[id]/role/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/organization/members/wrong-url-id/role", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(id: string, body: Record<string, unknown>) {
  return PUT(request(body), { params: Promise.resolve({ id }) });
}

describe("OrganizationMember role update DB-fresh policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.organizationId = "org-a";
    testState.authUserId = "user-a";
    testState.authRole = "brand_owner";
    testState.membership = {
      id: "actor-member",
      role: "brand_owner",
      penaltyUntil: null,
      roleDef: { name: "brand_owner", level: 90, permissions: JSON.stringify({ team_manage: true }) },
    };
    testState.vtm = null;
    testState.target = {
      id: "member-target",
      organizationId: "org-a",
      userId: "user-b",
      role: "viewer",
      roleDef: { name: "viewer", level: 20 },
    };
    testState.role = null;
    testState.ownerCount = 2;
    testState.orgActive = true;
    testState.orgBanned = false;
  });

  it("uses the dynamic route context id instead of parsing /role from the URL", async () => {
    const response = await put("member-target", { roleName: "sales_rep" });
    expect(response.status).toBe(200);
    expect(dbMocks.organizationMember.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "member-target" },
    }));
  });

  it("rejects both role selectors and performs no mutation", async () => {
    const response = await put("member-target", { roleId: "role-1", roleName: "viewer" });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("ROLE_SELECTOR_XOR");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("denies stale platform session state without active VTM", async () => {
    testState.authRole = "platform_admin";
    testState.membership = null;
    const response = await put("member-target", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });

  it("allows a same-org legacy owner through the canonical brand-owner policy", async () => {
    testState.authRole = "owner";
    testState.membership = {
      id: "legacy-owner",
      role: "owner",
      penaltyUntil: null,
      roleDef: null,
    };
    const response = await put("member-target", { roleName: "sales_rep" });
    expect(response.status).toBe(200);
    expect(dbMocks.organizationMember.update).toHaveBeenCalledOnce();
  });

  it("denies unsupported active VTM role without mutation", async () => {
    testState.vtm = { role: "platform_support", visibleSections: "[]" };
    const response = await put("member-target", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects protected and unknown roleName values", async () => {
    const protectedResponse = await put("member-target", { roleName: "platform_admin" });
    expect(protectedResponse.status).toBe(403);
    expect((await protectedResponse.json()).code).toBe("PLATFORM_ROLE_BLOCKED");
    const unknown = await put("member-target", { roleName: "made_up" });
    expect(unknown.status).toBe(400);
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a roleId that points to a protected role", async () => {
    testState.role = { id: "role-platform", name: "platform_admin", level: 95, permissions: "{}" };
    const response = await put("member-target", { roleId: "role-platform" });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("PLATFORM_ROLE_BLOCKED");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects roleId collisions with built-in names", async () => {
    testState.role = {
      id: "fake-viewer",
      name: "viewer",
      level: 20,
      permissions: JSON.stringify({ all: true, team_manage: true }),
    };
    const response = await put("member-target", { roleId: "fake-viewer" });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_ROLE");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("blocks changing one's own role", async () => {
    testState.target = {
      id: "actor-member", organizationId: "org-a", userId: "user-a", role: "brand_owner",
      roleDef: { name: "brand_owner", level: 90 },
    };
    const response = await put("actor-member", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("SELF_MUTATION_BLOCKED");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("protects the final brand owner from demotion", async () => {
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    testState.target = {
      id: "owner-target", organizationId: "org-a", userId: "user-b", role: "brand_owner",
      roleDef: { name: "brand_owner", level: 90 },
    };
    testState.ownerCount = 1;
    const response = await put("owner-target", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("LAST_OWNER_REQUIRED");
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });

  it("protects the final legacy owner alias from demotion", async () => {
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    testState.target = {
      id: "owner-target", organizationId: "org-a", userId: "user-b", role: "owner",
      roleDef: null,
    };
    testState.ownerCount = 1;
    const response = await put("owner-target", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("LAST_OWNER_REQUIRED");
    expect(dbMocks.organizationMember.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        role: { in: ["brand_owner", "owner", "ceo"], mode: "insensitive" },
      },
    });
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });

  it("updates an allowed canonical role atomically and clears stale roleId", async () => {
    const response = await put("member-target", { roleName: "sales_rep" });
    expect(response.status).toBe(200);
    expect(dbMocks.db.$transaction).toHaveBeenCalledOnce();
    expect(dbMocks.organizationMember.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "member-target" },
      data: { role: "sales_rep", roleId: null },
    }));
    const updateQuery = dbMocks.organizationMember.update.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };
    expect(updateQuery.select).not.toHaveProperty("pin");
  });

  it("fails closed if VTM authority is revoked before the atomic update", async () => {
    testState.membership = null;
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    dbMocks.valtrioxTeamMember.findFirst
      .mockResolvedValueOnce({ role: "platform_admin", visibleSections: "[]" })
      .mockResolvedValueOnce(null);

    const response = await put("member-target", { roleName: "viewer" });
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).toHaveBeenCalledOnce();
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });
});
