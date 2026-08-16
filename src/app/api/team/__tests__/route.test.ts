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
  org: null as null | { id: string; name: string; plan: string; subscription: { plan: { teamLimit: number; name: string } } | null },
  existingUser: null as null | { id: string; email: string },
  inviterUser: null as null | { id: string; email: string; role: string },
  createdUser: null as null | { id: string },
  createdMember: null as null | { id: string },
  createdInvitation: null as null | { id: string },
}));

const dbMocks = vi.hoisted(() => {
  const organizationMember = {
    findFirst: vi.fn(async () => testState.membership),
    count: vi.fn(async () => 0),
    create: vi.fn(async () => testState.createdMember ?? { id: "member-1" }),
  };
  const valtrioxTeamMember = {
    findFirst: vi.fn(async () => testState.vtm),
  };
  const teamInvitation = {
    count: vi.fn(async () => 0),
    create: vi.fn(async () => testState.createdInvitation ?? { id: "invite-1" }),
    findFirst: vi.fn(async () => null),
  };
  const organization = {
    findUnique: vi.fn(async () => testState.org ?? {
      id: "org-a",
      name: "Test Org",
      plan: "starter",
      subscription: { plan: { teamLimit: 10, name: "Starter" } },
    }),
  };
  const platformSettings = {
    findFirst: vi.fn(async () => ({ companyName: "Valtriox" })),
  };
  const user = {
    findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return testState.inviterUser ?? testState.existingUser ?? null;
      if (where.email) return testState.existingUser ?? null;
      return null;
    }),
    create: vi.fn(async () => testState.createdUser ?? { id: "user-2" }),
  };
  const db = {
    organizationMember,
    valtrioxTeamMember,
    teamInvitation,
    organization,
    platformSettings,
    user,
  };
  return { db, organizationMember, valtrioxTeamMember, teamInvitation, organization, platformSettings, user };
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

vi.mock("@/lib/sanitize", () => ({
  sanitizeEmail: vi.fn((email: string) => email.trim().toLowerCase()),
}));

vi.mock("@/lib/validations", () => ({
  validateBody: async (req: NextRequest) => {
    const body = await req.json();
    return { success: true, data: body };
  },
}));

const roleDefs: Record<string, { permissions: Record<string, boolean>; all?: boolean }> = {
  platform_owner: { permissions: {}, all: true },
  platform_admin: { permissions: {}, all: true },
  brand_owner: { permissions: { team_manage: true } },
  brand_admin: { permissions: { team_manage: true } },
  operations_manager: { permissions: { team_manage: false } },
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

vi.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: vi.fn(async () => "hashed-pin"),
    compare: vi.fn(async () => true),
  },
}));

import { POST } from "@/app/api/team/route";

function postTeam(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return response.json();
}

describe("Team API authorization", () => {
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
    testState.org = {
      id: "org-a",
      name: "Test Org",
      plan: "starter",
      subscription: { plan: { teamLimit: 10, name: "Starter" } },
    };
    testState.existingUser = null;
    testState.inviterUser = { id: "user-a", email: "owner@example.com", role: "brand_owner" };
    testState.createdUser = null;
    testState.createdMember = null;
    testState.createdInvitation = null;
  });

  it("viewer without team_manage is denied and mutations are not called", async () => {
    testState.authRole = "viewer";
    testState.membership = {
      role: "viewer",
      roleDef: { name: "viewer", permissions: JSON.stringify({ team_manage: false }) },
    };
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "viewer",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
    expect(dbMocks.user.create).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.create).not.toHaveBeenCalled();
    expect(dbMocks.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("unknown role is denied and mutations are not called", async () => {
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "unknown_role",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
    expect(dbMocks.user.create).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.create).not.toHaveBeenCalled();
    expect(dbMocks.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("stale platform_admin session without active VTM is denied", async () => {
    testState.authRole = "platform_admin";
    testState.membership = null;
    testState.vtm = null;
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "viewer",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
    expect(dbMocks.user.create).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.create).not.toHaveBeenCalled();
    expect(dbMocks.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("cross-org session role without active VTM is denied", async () => {
    testState.authRole = "platform_admin";
    testState.membership = null;
    testState.vtm = null;
    const res = await POST(postTeam({
      organizationId: "org-b",
      email: "new@example.com",
      name: "New User",
      role: "viewer",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
  });

  it("protected roleName is denied with PLATFORM_ROLE_BLOCKED", async () => {
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "platform_owner",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
    const data = await json(res);
    expect(data.code).toBe("PLATFORM_ROLE_BLOCKED");
    expect(dbMocks.organizationMember.create).not.toHaveBeenCalled();
  });

  it("brand_owner cannot assign brand_admin due to hierarchy", async () => {
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "brand_admin",
      pin: "123456",
    }));
    expect(res.status).toBe(403);
    const data = await json(res);
    expect(data.code).toBe("BRAND_OWNER_ROLE_LIMIT");
  });

  it("valid same-org manager invitation is allowed", async () => {
    testState.authRole = "brand_owner";
    testState.membership = {
      role: "brand_owner",
      roleDef: { name: "brand_owner", permissions: JSON.stringify({ team_manage: true }) },
    };
    testState.createdUser = { id: "user-2" };
    testState.createdMember = { id: "member-2" };
    testState.createdInvitation = { id: "invite-2" };
    const res = await POST(postTeam({
      organizationId: "org-a",
      email: "new@example.com",
      name: "New User",
      role: "viewer",
      pin: "123456",
    }));
    expect(res.status).toBe(201);
    expect(dbMocks.user.create).toHaveBeenCalled();
    expect(dbMocks.organizationMember.create).toHaveBeenCalled();
    expect(dbMocks.teamInvitation.create).toHaveBeenCalled();
  });
});