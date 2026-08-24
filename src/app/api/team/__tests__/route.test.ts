// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type MemberRole = {
  name: string;
  permissions: string;
  level: number;
};

const testState = vi.hoisted(() => ({
  organizationId: "org-a",
  authUserId: "user-a",
  authEmail: "owner@example.com",
  authRole: "brand_owner",
  membership: null as null | {
    id: string;
    role: string;
    penaltyUntil: Date | null;
    roleDef: MemberRole | null;
  },
  vtm: null as null | { role: string; visibleSections?: string },
  targetMember: null as null | {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    roleDef: { name: string; level: number } | null;
    user: { email: string };
  },
  invitation: null as null | { id: string; organizationId: string; status: string },
  existingUser: null as null | { id: string; email: string; name?: string; role?: string },
  existingInvitation: null as null | { id: string },
  listedMembers: [] as Array<Record<string, unknown>>,
  listedInvitations: [] as Array<Record<string, unknown>>,
  ownerCount: 2,
  memberCount: 0,
  pendingCount: 0,
  orgActive: true,
  orgBanned: false,
}));

const dbMocks = vi.hoisted(() => {
  const organizationMember = {
    findFirst: vi.fn(async ({ where }: { where: { userId?: string } }) =>
      where.userId === testState.authUserId ? testState.membership : null),
    findMany: vi.fn(async (args?: unknown) => {
      void args;
      return testState.listedMembers;
    }),
    findUnique: vi.fn(async () => testState.targetMember),
    count: vi.fn(async ({ where }: { where?: { role?: string | { in?: string[]; mode?: string } } } = {}) => {
      const role = where?.role;
      const countsOwners = role === "brand_owner" || (
        typeof role === "object" && role?.in?.includes("brand_owner")
      );
      return countsOwners ? testState.ownerCount : testState.memberCount;
    }),
    create: vi.fn(async (args?: unknown) => {
      void args;
      return { id: "member-created" };
    }),
    delete: vi.fn(async () => ({ id: "member-deleted" })),
  };
  const valtrioxTeamMember = {
    findFirst: vi.fn(async () => testState.vtm),
  };
  const teamInvitation = {
    findMany: vi.fn(async (args?: unknown) => {
      void args;
      return testState.listedInvitations;
    }),
    findFirst: vi.fn(async () => testState.existingInvitation),
    findUnique: vi.fn(async () => testState.invitation),
    count: vi.fn(async () => testState.pendingCount),
    create: vi.fn(async () => ({ id: "invite-created" })),
    updateMany: vi.fn(async () => ({ count: 1 })),
  };
  const organization = {
    findUnique: vi.fn(async () => ({
      id: "org-a",
      name: "Test Org",
      email: "org@example.com",
      plan: "starter",
      isActive: testState.orgActive,
      isBanned: testState.orgBanned,
      subscription: { plan: { teamLimit: 10, name: "Starter" } },
    })),
  };
  const platformSettings = {
    findFirst: vi.fn(async () => ({ companyName: "Valtriox" })),
  };
  const user = {
    findUnique: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return { id: testState.authUserId, name: "Owner", email: testState.authEmail, role: testState.authRole };
      if (where.email) return testState.existingUser;
      return null;
    }),
    create: vi.fn(async ({ data }: { data: { email: string; name: string; role: string } }) => ({
      id: "user-created",
      ...data,
    })),
  };
  const db = {
    organizationMember,
    valtrioxTeamMember,
    teamInvitation,
    organization,
    platformSettings,
    user,
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (operation: (client: typeof db) => unknown) => operation(db));
  return { db, organizationMember, valtrioxTeamMember, teamInvitation, user };
});

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: <T>(operation: () => T): T => operation(),
  isDbUnavailable: () => false,
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth:
    (handler: (...args: unknown[]) => unknown) =>
    (req: NextRequest, context?: unknown) =>
      handler(req, {
        userId: testState.authUserId,
        email: testState.authEmail,
        role: testState.authRole,
        organizationId: testState.organizationId,
      }, context),
}));

vi.mock("@/lib/rate-limit", () => ({ withRateLimit: (handler: (...args: unknown[]) => unknown) => handler }));
vi.mock("@/lib/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/sanitize", () => ({ sanitizeEmail: (email: string) => email.trim().toLowerCase() }));
vi.mock("@/lib/validations", () => ({
  validateBody: async (req: NextRequest) => ({ success: true, data: await req.json() }),
}));
vi.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: vi.fn(async () => "hashed-pin"), compare: vi.fn(async () => true) },
}));

import { DELETE, GET, POST } from "@/app/api/team/route";

const roleDef = (name: string, level: number, permissions: Record<string, boolean>): MemberRole => ({
  name,
  level,
  permissions: JSON.stringify(permissions),
});

function teamRequest(method: "GET" | "POST" | "DELETE", query = "", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/team${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function inviteBody(role = "viewer") {
  return { organizationId: "org-a", email: "new@example.com", name: "New User", role, pin: "123456" };
}

describe("Team API DB-fresh authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.organizationId = "org-a";
    testState.authUserId = "user-a";
    testState.authRole = "brand_owner";
    testState.membership = {
      id: "actor-member",
      role: "brand_owner",
      penaltyUntil: null,
      roleDef: roleDef("brand_owner", 90, { team_manage: true }),
    };
    testState.vtm = null;
    testState.targetMember = null;
    testState.invitation = null;
    testState.existingUser = null;
    testState.existingInvitation = null;
    testState.listedMembers = [];
    testState.listedInvitations = [];
    testState.ownerCount = 2;
    testState.memberCount = 0;
    testState.pendingCount = 0;
    testState.orgActive = true;
    testState.orgBanned = false;
  });

  it("GET permits a fresh team_view membership", async () => {
    testState.membership = {
      id: "viewer-member",
      role: "viewer",
      penaltyUntil: null,
      roleDef: roleDef("viewer", 20, { team_view: true }),
    };
    const response = await GET(teamRequest("GET"));
    expect(response.status).toBe(200);
    expect(dbMocks.organizationMember.findMany).toHaveBeenCalledOnce();
    expect(dbMocks.teamInvitation.findMany).not.toHaveBeenCalled();
  });

  it("GET never returns membership or invitation PIN hashes", async () => {
    testState.membership = {
      id: "owner-member",
      role: "brand_owner",
      penaltyUntil: null,
      roleDef: roleDef("brand_owner", 90, { team_manage: true }),
    };
    testState.listedMembers = [{
      id: "member-b",
      organizationId: "org-a",
      userId: "user-b",
      role: "viewer",
      roleId: null,
      joinedAt: new Date(),
      pin: "bcrypt-member-hash",
      penaltyUntil: new Date(),
      user: { id: "user-b", name: "Viewer", email: "viewer@example.com", image: null, role: "platform_admin" },
      roleDef: { id: "viewer-role", name: "viewer", label: "Viewer", description: null, level: 20, permissions: "{}" },
    }];
    testState.listedInvitations = [{
      id: "invite-b",
      organizationId: "org-a",
      inviterId: "user-a",
      inviteeEmail: "invitee@example.com",
      inviteeName: "Invitee",
      role: "viewer",
      pin: "bcrypt-invitation-hash",
      status: "pending",
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    }];

    const response = await GET(teamRequest("GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.members[0]).not.toHaveProperty("pin");
    expect(body.members[0]).not.toHaveProperty("penaltyUntil");
    expect(body.members[0].user).not.toHaveProperty("role");
    expect(body.members[0].roleDef).not.toHaveProperty("permissions");
    expect(body.pendingInvitations[0]).not.toHaveProperty("pin");
    expect(body.pendingInvitations[0]).not.toHaveProperty("inviterId");
    const memberQuery = dbMocks.organizationMember.findMany.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };
    const invitationQuery = dbMocks.teamInvitation.findMany.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };
    expect(memberQuery.select).not.toHaveProperty("pin");
    expect(invitationQuery.select).not.toHaveProperty("pin");
  });

  it("GET denies a membership without team_view before loading team data", async () => {
    testState.membership = {
      id: "support-member",
      role: "support_agent",
      penaltyUntil: null,
      roleDef: roleDef("support_agent", 50, { team_view: false }),
    };
    const response = await GET(teamRequest("GET"));
    expect(response.status).toBe(403);
    expect(dbMocks.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it("GET denies a stale platform session without an active VTM", async () => {
    testState.authRole = "platform_admin";
    testState.membership = null;
    const response = await GET(teamRequest("GET"));
    expect(response.status).toBe(403);
  });

  it("GET maps a same-org legacy owner membership without granting cross-org access", async () => {
    testState.authRole = "owner";
    testState.membership = {
      id: "legacy-owner",
      role: "owner",
      penaltyUntil: null,
      roleDef: null,
    };

    const sameOrg = await GET(teamRequest("GET"));
    expect(sameOrg.status).toBe(200);

    testState.organizationId = "org-b";
    const crossOrg = await GET(teamRequest("GET", "?orgId=org-a"));
    expect(crossOrg.status).toBe(403);
  });

  it("GET denies even an active platform admin for an inactive organization", async () => {
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    testState.orgActive = false;
    const response = await GET(teamRequest("GET"));
    expect(response.status).toBe(403);
    expect(dbMocks.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it("GET denies an unsupported active VTM role", async () => {
    testState.authRole = "platform_support";
    testState.vtm = { role: "platform_support" };
    const response = await GET(teamRequest("GET"));
    expect(response.status).toBe(403);
    expect(dbMocks.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it.each(["not-json", JSON.stringify(["team-management"]), JSON.stringify(["user-management"]), JSON.stringify(["*"])])(
    "GET fails closed for malformed or hidden VTM team sections: %s",
    async (visibleSections) => {
      testState.vtm = { role: "platform_admin", visibleSections };
      const response = await GET(teamRequest("GET"));
      expect(response.status).toBe(403);
      expect(dbMocks.organizationMember.findMany).not.toHaveBeenCalled();
    },
  );

  it("POST denies unsupported active VTM roles without mutation", async () => {
    testState.vtm = { role: "platform_engineer" };
    const response = await POST(teamRequest("POST", "", inviteBody()));
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
    expect(dbMocks.user.create).not.toHaveBeenCalled();
  });

  it("POST enforces an active organization-member penalty before VTM grants", async () => {
    testState.membership = {
      id: "penalized-member",
      role: "brand_owner",
      penaltyUntil: new Date(Date.now() + 60_000),
      roleDef: roleDef("brand_owner", 90, { team_manage: true }),
    };
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    const response = await POST(teamRequest("POST", "", inviteBody()));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("PENALTY_ACTIVE");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("POST ignores colliding DB roleDef permissions for a built-in viewer", async () => {
    testState.membership = {
      id: "viewer-member",
      role: "viewer",
      penaltyUntil: null,
      roleDef: roleDef("viewer", 99, { all: true, team_manage: true }),
    };
    const response = await POST(teamRequest("POST", "", inviteBody()));
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("POST rejects unknown and protected roles before mutation", async () => {
    const unknown = await POST(teamRequest("POST", "", inviteBody("unknown_role")));
    expect(unknown.status).toBe(403);
    const protectedResponse = await POST(teamRequest("POST", "", inviteBody("platform_owner")));
    expect(protectedResponse.status).toBe(403);
    expect((await protectedResponse.json()).code).toBe("PLATFORM_ROLE_BLOCKED");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("POST enforces brand-owner assignment hierarchy", async () => {
    const response = await POST(teamRequest("POST", "", inviteBody("brand_admin")));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("BRAND_OWNER_ROLE_LIMIT");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("POST creates user, membership, and invitation in one transaction", async () => {
    const response = await POST(teamRequest("POST", "", inviteBody()));
    expect(response.status).toBe(201);
    expect(dbMocks.db.$transaction).toHaveBeenCalledOnce();
    expect(dbMocks.user.create).toHaveBeenCalledOnce();
    expect(dbMocks.organizationMember.create).toHaveBeenCalledOnce();
    expect(dbMocks.teamInvitation.create).toHaveBeenCalledOnce();
    const createQuery = dbMocks.organizationMember.create.mock.calls[0]?.[0] as {
      select: Record<string, unknown>;
    };
    expect(createQuery.select).not.toHaveProperty("pin");
    expect((await response.json()).pendingCount).toBe(0);
  });

  it("POST fails closed if VTM authority is revoked before the transaction", async () => {
    testState.membership = null;
    testState.vtm = { role: "platform_admin", visibleSections: "[]" };
    dbMocks.valtrioxTeamMember.findFirst
      .mockResolvedValueOnce({ role: "platform_admin", visibleSections: "[]" })
      .mockResolvedValueOnce(null);

    const response = await POST(teamRequest("POST", "", inviteBody()));
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).toHaveBeenCalledOnce();
    expect(dbMocks.user.create).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.create).not.toHaveBeenCalled();
    expect(dbMocks.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("DELETE denies an unsupported VTM role without mutation", async () => {
    testState.vtm = { role: "platform_sales" };
    testState.targetMember = {
      id: "target", organizationId: "org-a", userId: "user-b", role: "viewer",
      roleDef: null, user: { email: "target@example.com" },
    };
    const response = await DELETE(teamRequest("DELETE", "?memberId=target"));
    expect(response.status).toBe(403);
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.delete).not.toHaveBeenCalled();
  });

  it("DELETE blocks self-removal before mutation", async () => {
    testState.targetMember = {
      id: "actor-member", organizationId: "org-a", userId: "user-a", role: "brand_owner",
      roleDef: { name: "brand_owner", level: 90 }, user: { email: "owner@example.com" },
    };
    const response = await DELETE(teamRequest("DELETE", "?memberId=actor-member"));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("SELF_MUTATION_BLOCKED");
    expect(dbMocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("DELETE protects the final brand owner", async () => {
    testState.vtm = { role: "platform_admin" };
    testState.ownerCount = 1;
    testState.targetMember = {
      id: "owner-target", organizationId: "org-a", userId: "user-b", role: "brand_owner",
      roleDef: { name: "brand_owner", level: 90 }, user: { email: "target@example.com" },
    };
    const response = await DELETE(teamRequest("DELETE", "?memberId=owner-target"));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("LAST_OWNER_REQUIRED");
    expect(dbMocks.organizationMember.delete).not.toHaveBeenCalled();
  });

  it("DELETE protects the final legacy owner alias", async () => {
    testState.vtm = { role: "platform_admin" };
    testState.ownerCount = 1;
    testState.targetMember = {
      id: "owner-target", organizationId: "org-a", userId: "user-b", role: "owner",
      roleDef: null, user: { email: "target@example.com" },
    };
    const response = await DELETE(teamRequest("DELETE", "?memberId=owner-target"));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("LAST_OWNER_REQUIRED");
    expect(dbMocks.organizationMember.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        role: { in: ["brand_owner", "owner", "ceo"], mode: "insensitive" },
      },
    });
    expect(dbMocks.organizationMember.delete).not.toHaveBeenCalled();
  });

  it("DELETE atomically revokes pending invitations and removes an authorized target", async () => {
    testState.targetMember = {
      id: "viewer-target", organizationId: "org-a", userId: "user-b", role: "viewer",
      roleDef: { name: "viewer", level: 20 }, user: { email: "target@example.com" },
    };
    const response = await DELETE(teamRequest("DELETE", "?memberId=viewer-target"));
    expect(response.status).toBe(200);
    expect(dbMocks.db.$transaction).toHaveBeenCalledOnce();
    expect(dbMocks.teamInvitation.updateMany).toHaveBeenCalledOnce();
    expect(dbMocks.organizationMember.delete).toHaveBeenCalledOnce();
  });

  it("DELETE permits an active platform admin to revoke a cross-org invitation", async () => {
    testState.vtm = { role: "platform_admin" };
    testState.invitation = { id: "invite-b", organizationId: "org-b", status: "pending" };
    const response = await DELETE(teamRequest("DELETE", "?invitationId=invite-b"));
    expect(response.status).toBe(200);
    expect(dbMocks.teamInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-b", status: "pending" },
      data: { status: "revoked" },
    });
  });
});
