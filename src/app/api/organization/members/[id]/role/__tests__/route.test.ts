// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string,
  authUserId: "user-a",
  authEmail: "owner@example.com",
  authRole: "brand_owner",
  membership: null as null | {
    role: string;
    roleDef: { name: string; permissions: string } | null;
  },
  vtm: null as null | { role: string },
  targetMember: null as null | { id: string; organizationId: string },
  role: null as null | { id: string; name: string },
  updatedMember: null as null | { id: string },
}));

const dbMocks = vi.hoisted(() => {
  const organizationMember = {
    findFirst: vi.fn(async () => testState.membership),
    findUnique: vi.fn(async () => testState.targetMember),
    update: vi.fn(async () => testState.updatedMember ?? { id: "target" }),
  };
  const valtrioxTeamMember = {
    findFirst: vi.fn(async () => testState.vtm),
  };
  const role = {
    findUnique: vi.fn(async () => testState.role),
  };
  const db = { organizationMember, valtrioxTeamMember, role };
  return { db, organizationMember, valtrioxTeamMember, role };
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
    (req: NextRequest, context?: unknown) =>
      handler(
        req,
        {
          userId: testState.authUserId,
          email: testState.authEmail,
          role: testState.authRole,
          organizationId: testState.organizationId,
        },
        context,
      ),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/validations/api", () => ({
  validateBody: async (req: NextRequest) => {
    const body = await req.json();
    return { success: true, data: body };
  },
}));

vi.mock("@/lib/validations/schemas", () => ({
  updateMemberRoleApiSchema: {},
}));

const roleDefs: Record<string, { permissions: Record<string, boolean>; all?: boolean }> = {
  platform_owner: { permissions: {}, all: true },
  platform_admin: { permissions: {}, all: true },
  brand_owner: { permissions: { team_manage: true } },
  brand_admin: { permissions: { team_manage: true } },
  viewer: { permissions: { team_manage: false } },
};

vi.mock("@/lib/roles", () => ({
  getRoleByName: vi.fn((name: string) => roleDefs[name] ?? null),
  hasPermission: vi.fn(
    (roleDef: { permissions: Record<string, boolean>; all?: boolean } | null, permission: string) => {
      if (!roleDef) return false;
      if (roleDef.all) return true;
      return roleDef.permissions[permission] === true;
    },
  ),
  getAdminEmail: vi.fn(() => ""),
  canAssignRole: vi.fn(() => ({ allowed: true })),
}));

import { PUT } from "@/app/api/organization/members/[id]/role/route";

function putRole(id: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/organization/members/${id}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json();
}

describe("OrganizationMember role update authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.organizationId = "org-a";
    testState.authRole = "brand_owner";
    testState.authEmail = "owner@example.com";
    testState.membership = {
      role: "brand_owner",
      roleDef: { name: "brand_owner", permissions: JSON.stringify({ team_manage: true }) },
    };
    testState.vtm = null;
    testState.targetMember = { id: "member-target", organizationId: "org-a" };
    testState.role = null;
    testState.updatedMember = null;
  });

  it("roleName platform role is denied and update is not called", async () => {
    const res = await PUT(putRole("member-target", { roleName: "platform_admin" }));
    expect(res.status).toBe(403);
    const data = await json(res);
    expect(data.code).toBe("PLATFORM_ROLE_BLOCKED");
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });

  it("roleId pointing to platform role is denied and update is not called", async () => {
    testState.role = { id: "role-platform", name: "platform_admin" };
    const res = await PUT(putRole("member-target", { roleId: "role-platform" }));
    expect(res.status).toBe(403);
    const data = await json(res);
    expect(data.code).toBe("PLATFORM_ROLE_BLOCKED");
    expect(dbMocks.organizationMember.update).not.toHaveBeenCalled();
  });

  it("normal role update is allowed", async () => {
    testState.updatedMember = { id: "member-target" };
    const res = await PUT(putRole("member-target", { roleName: "viewer" }));
    expect(res.status).toBe(200);
    expect(dbMocks.organizationMember.update).toHaveBeenCalled();
  });
});