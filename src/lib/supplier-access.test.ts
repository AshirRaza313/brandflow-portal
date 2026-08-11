// @vitest-environment node
/**
 * resolveSupplierAccess unit tests — Expert review Issues B01-B07
 *
 * Tests the authorization resolver directly (no React, no HTTP).
 * Mocks PrismaClient findFirst methods + roles module.
 *
 * B01: penaltyUntil per-request check
 * B02: Valtriox team without org membership
 * B03 v2: stale valtriox_team role returns 403 (no viewer demotion)
 * B04: hidden section rule for valtriox team
 * B05: stale non-null roleId (roleDef.name mismatch)
 * B06: genuine custom roles
 * B07: stats authorization (same resolver as list)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mock roles module — must be defined BEFORE importing supplier-access
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("@/lib/roles", () => {
  const roles: Record<string, { name: string; label: string; description: string; level: number; permissions: Record<string, boolean> }> = {
    viewer: { name: "viewer", label: "Viewer", description: "Read-only", level: 0, permissions: { operations: true } },
    brand_owner: { name: "brand_owner", label: "Brand Owner", description: "Full access", level: 100, permissions: { operations: true } },
    brand_admin: { name: "brand_admin", label: "Brand Admin", description: "Admin access", level: 80, permissions: { operations: true } },
    operations_manager: { name: "operations_manager", label: "Operations Manager", description: "Ops access", level: 60, permissions: { operations: true } },
    content_creator: { name: "content_creator", label: "Content Creator", description: "Content access", level: 40, permissions: { operations: false } },
    valtriox_team: { name: "valtriox_team", label: "Valtriox Team", description: "Platform team", level: 200, permissions: { operations: true } },
  };

  return {
    getRoleByName: vi.fn((name: string) => roles[name] ?? null),
    hasPermission: vi.fn((roleDef: { permissions: Record<string, boolean> } | null, permission: string) => {
      if (!roleDef) return false;
      return roleDef.permissions[permission] === true;
    }),
    isReadOnlyRole: vi.fn((roleName: string) => roleName === "viewer"),
  };
});

import { resolveSupplierAccess } from "./supplier-access";
import type { SupplierAccessClient } from "./supplier-access";
import type { AuthContext } from "@/lib/auth-middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────
interface MockMembership {
  role: string;
  roleDef: { name: string; permissions: string } | null;
  penaltyUntil: Date | null;
}

interface MockTeamMember {
  id: string;
  visibleSections: string | null;
}

function makeClient(opts: {
  membership?: MockMembership | null;
  teamMember?: MockTeamMember | null;
}): SupplierAccessClient {
  return {
    organizationMember: {
      findFirst: vi.fn(async () => opts.membership ?? null),
    },
    valtrioxTeamMember: {
      findFirst: vi.fn(async () => opts.teamMember ?? null),
    },
  } as unknown as SupplierAccessClient;
}

const authCtx = { organizationId: "org_1", userId: "user_1" } as unknown as Parameters<typeof resolveSupplierAccess>[1];

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// B01 — penaltyUntil per-request check
// ─────────────────────────────────────────────────────────────────────────────
describe("B01 — penaltyUntil check", () => {
  it("returns null when penaltyUntil is in the future", async () => {
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: null,
        penaltyUntil: new Date(Date.now() + 86400000), // tomorrow
      },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).toBeNull();
  });

  it("grants access when penaltyUntil is in the past", async () => {
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: null,
        penaltyUntil: new Date(Date.now() - 86400000), // yesterday
      },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    expect(result?.canReadSuppliers).toBe(true);
  });

  it("grants access when penaltyUntil is null", async () => {
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: null,
        penaltyUntil: null,
      },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    expect(result?.canReadSuppliers).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B02 — Valtriox team without org membership
// ─────────────────────────────────────────────────────────────────────────────
describe("B02 — Valtriox team without org membership", () => {
  it("grants team access when active team member has no org membership", async () => {
    const client = makeClient({
      membership: null,
      teamMember: { id: "vtm_1", visibleSections: "[]" },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    expect(result?.effectiveRole).toBe("valtriox_team");
    expect(result?.canReadSuppliers).toBe(true);
    expect(result?.canWriteSuppliers).toBe(true);
  });

  it("denies access when no membership AND no team member", async () => {
    const client = makeClient({
      membership: null,
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).toBeNull();
  });

  it("denies access when no organizationId in authCtx", async () => {
    const client = makeClient({ membership: null, teamMember: null });
    const result = await resolveSupplierAccess(client, { ...authCtx, organizationId: "" } as typeof authCtx);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B03 v2 — Stale valtriox_team stored role
// ─────────────────────────────────────────────────────────────────────────────
describe("B03 v2 — stale valtriox_team role", () => {
  it("returns null (403) when stored role is valtriox_team but no active team record", async () => {
    const client = makeClient({
      membership: {
        role: "valtriox_team",
        roleDef: null,
        penaltyUntil: null,
      },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).toBeNull();
  });

  it("grants team access when stored role is valtriox_team AND active team record exists", async () => {
    const client = makeClient({
      membership: {
        role: "valtriox_team",
        roleDef: null,
        penaltyUntil: null,
      },
      teamMember: { id: "vtm_1", visibleSections: "[]" },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    expect(result?.effectiveRole).toBe("valtriox_team");
    expect(result?.canReadSuppliers).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B04 — Hidden section rule for valtriox team
// ─────────────────────────────────────────────────────────────────────────────
describe("B04 — hidden section rule", () => {
  it("denies read when suppliers is in hiddenSections (team-only access)", async () => {
    const client = makeClient({
      membership: null,
      teamMember: { id: "vtm_1", visibleSections: JSON.stringify(["suppliers"]) },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    expect(result?.canReadSuppliers).toBe(false);
    expect(result?.canWriteSuppliers).toBe(false);
  });

  it("grants read when suppliers is NOT in hiddenSections", async () => {
    const client = makeClient({
      membership: null,
      teamMember: { id: "vtm_1", visibleSections: "[]" },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.canReadSuppliers).toBe(true);
  });

  it("grants read when visibleSections is null", async () => {
    const client = makeClient({
      membership: null,
      teamMember: { id: "vtm_1", visibleSections: null },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.canReadSuppliers).toBe(true);
  });

  it("applies hidden section rule even when org membership exists", async () => {
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: null,
        penaltyUntil: null,
      },
      teamMember: { id: "vtm_1", visibleSections: JSON.stringify(["suppliers"]) },
    });
    const result = await resolveSupplierAccess(client, authCtx);
    // Team member takes precedence — hidden section applies
    expect(result?.effectiveRole).toBe("valtriox_team");
    expect(result?.canReadSuppliers).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B05 — Stale non-null roleId (roleDef.name mismatch)
// ─────────────────────────────────────────────────────────────────────────────
describe("B05 — stale roleId", () => {
  it("falls back to getRoleByName when roleDef.name does not match current role", async () => {
    // membership.role = content_creator (no operations permission)
    // roleDef.name = brand_admin (stale — has operations permission)
    // If stale permissions used → canRead=true (BUG)
    // If getRoleByName used → canRead=false (CORRECT)
    const client = makeClient({
      membership: {
        role: "content_creator",
        roleDef: {
          name: "brand_admin", // stale — points to old role
          permissions: JSON.stringify({ operations: true }),
        },
        penaltyUntil: null,
      },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    // content_creator has operations=false → canRead=false
    expect(result?.canReadSuppliers).toBe(false);
  });

  it("uses stored roleDef permissions when name matches current role", async () => {
    // membership.role = brand_admin
    // roleDef.name = brand_admin (match)
    // Stored permissions say operations=false (overridden from default)
    // If stored used → canRead=false
    // If getRoleByName used → canRead=true (default brand_admin has operations=true)
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: {
          name: "brand_admin", // matches
          permissions: JSON.stringify({ operations: false }), // overridden
        },
        penaltyUntil: null,
      },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).not.toBeNull();
    // Stored permissions used → operations=false → canRead=false
    expect(result?.canReadSuppliers).toBe(false);
  });

  it("falls back to getRoleByName when roleDef is null", async () => {
    const client = makeClient({
      membership: {
        role: "brand_admin",
        roleDef: null,
        penaltyUntil: null,
      },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.canReadSuppliers).toBe(true); // default brand_admin has operations=true
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B06 — Genuine custom roles
// ─────────────────────────────────────────────────────────────────────────────
describe("B06 — genuine custom roles", () => {
  it("brand_admin: canRead=true, canWrite=true", async () => {
    const client = makeClient({
      membership: { role: "brand_admin", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.effectiveRole).toBe("brand_admin");
    expect(result?.canReadSuppliers).toBe(true);
    expect(result?.canWriteSuppliers).toBe(true);
  });

  it("viewer: canRead=true, canWrite=false (read-only)", async () => {
    const client = makeClient({
      membership: { role: "viewer", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.effectiveRole).toBe("viewer");
    expect(result?.canReadSuppliers).toBe(true);
    expect(result?.canWriteSuppliers).toBe(false);
  });

  it("content_creator: canRead=false (no operations permission)", async () => {
    const client = makeClient({
      membership: { role: "content_creator", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.effectiveRole).toBe("content_creator");
    expect(result?.canReadSuppliers).toBe(false);
    expect(result?.canWriteSuppliers).toBe(false);
  });

  it("operations_manager: canRead=true, canWrite=true", async () => {
    const client = makeClient({
      membership: { role: "operations_manager", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.effectiveRole).toBe("operations_manager");
    expect(result?.canReadSuppliers).toBe(true);
    expect(result?.canWriteSuppliers).toBe(true);
  });

  it("legacy role mapping: admin → brand_admin", async () => {
    const client = makeClient({
      membership: { role: "admin", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.effectiveRole).toBe("brand_admin");
    expect(result?.canReadSuppliers).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B07 — Stats authorization (same resolver as list)
// ─────────────────────────────────────────────────────────────────────────────
describe("B07 — stats authorization", () => {
  it("canReadSuppliers=true grants stats access", async () => {
    const client = makeClient({
      membership: { role: "brand_admin", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.canReadSuppliers).toBe(true);
    // Stats route checks canReadSuppliers — true means access granted
  });

  it("canReadSuppliers=false denies stats access", async () => {
    const client = makeClient({
      membership: { role: "content_creator", roleDef: null, penaltyUntil: null },
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result?.canReadSuppliers).toBe(false);
    // Stats route checks canReadSuppliers — false means 403
  });

  it("null result denies stats access", async () => {
    const client = makeClient({
      membership: null,
      teamMember: null,
    });
    const result = await resolveSupplierAccess(client, authCtx);
    expect(result).toBeNull();
    // Stats route: if (!access || !access.canReadSuppliers) → 403
  });
});
// ════════════════════════════════════════════════════════════════════════════
// B06 v2: REAL custom roles with operations: true/false
// ════════════════════════════════════════════════════════════════════════════
describe("B06 v2 — real custom roles with operations permission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grants access when custom roleDef has operations: true", async () => {
    const mockClient = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({
          role: "custom_manager",
          roleDef: {
            name: "custom_manager",
            permissions: JSON.stringify({
              dashboard: true,
              operations: true,
              products: true,
            }),
          },
          penaltyUntil: null,
        }),
      },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(true);
    expect(result!.canWriteSuppliers).toBe(true);
    expect(result!.effectiveRole).toBe("custom_manager");
  });

  it("denies access when custom roleDef has operations: false", async () => {
    const mockClient = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({
          role: "custom_reader",
          roleDef: {
            name: "custom_reader",
            permissions: JSON.stringify({
              dashboard: true,
              operations: false,
              products: true,
            }),
          },
          penaltyUntil: null,
        }),
      },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(false);
    expect(result!.canWriteSuppliers).toBe(false);
  });

  it("ignores custom roleDef when name does not match member role (stale roleId)", async () => {
    // role = content_creator (operations: false in mock)
    // roleDef.name = custom_manager (stale - doesn't match)
    // roleDef.permissions = operations: true (stale - should be IGNORED)
    // If stale used → canRead=true (BUG)
    // If getRoleByName used → canRead=false (CORRECT, content_creator has operations: false)
    const mockClient = {
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({
          role: "content_creator",
          roleDef: {
            name: "custom_manager",
            permissions: JSON.stringify({ operations: true }),
          },
          penaltyUntil: null,
        }),
      },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(false);
    expect(result!.canWriteSuppliers).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Point 10: Malformed visibleSections fail-safe
// ════════════════════════════════════════════════════════════════════════════
describe("Point 10 — malformed visibleSections fail-safe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats malformed JSON visibleSections as no restrictions (all visible)", async () => {
    const mockClient = {
      organizationMember: { findFirst: vi.fn().mockResolvedValue(null) },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: "vtm_1",
          visibleSections: "{not valid json",
        }),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(true);
    expect(result!.canWriteSuppliers).toBe(true);
  });

  it("treats non-array visibleSections as no restrictions", async () => {
    const mockClient = {
      organizationMember: { findFirst: vi.fn().mockResolvedValue(null) },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: "vtm_1",
          visibleSections: JSON.stringify({ suppliers: true }),
        }),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(true);
  });

  it("filters non-string entries in visibleSections array", async () => {
    const mockClient = {
      organizationMember: { findFirst: vi.fn().mockResolvedValue(null) },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: "vtm_1",
          visibleSections: JSON.stringify([
            "suppliers",
            123,
            null,
            "dashboard",
          ]),
        }),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(false);
    expect(result!.canWriteSuppliers).toBe(false);
  });

  it("null visibleSections means all sections visible", async () => {
    const mockClient = {
      organizationMember: { findFirst: vi.fn().mockResolvedValue(null) },
      valtrioxTeamMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: "vtm_1",
          visibleSections: null,
        }),
      },
    } as unknown as SupplierAccessClient;

    const result = await resolveSupplierAccess(mockClient, {
      userId: "user_1",
      organizationId: "org_1",
    } as AuthContext);

    expect(result).not.toBeNull();
    expect(result!.canReadSuppliers).toBe(true);
    expect(result!.canWriteSuppliers).toBe(true);
  });
});