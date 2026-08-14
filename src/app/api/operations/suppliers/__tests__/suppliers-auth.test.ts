// src/app/api/operations/suppliers/__tests__/suppliers-auth.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Issue #2 — Authorization tests for Supplier API
// ─────────────────────────────────────────────────────────────────────────────
// Verifies the resolveSupplierAccess helper enforces DB-resolved authorization
// on every request, with stale-session protection.
//
// Test matrix (required by expert reviewer):
//   1. Viewer — can GET, cannot POST/PATCH/DELETE (403)
//   2. Brand Owner — can do everything (200/201)
//   3. Operations Manager — can do everything
//   4. Custom Role with operations:true but viewer name → can GET, cannot POST
//   5. Role Demotion — session says "admin" but DB member has "viewer" → treated as viewer
//   6. Membership Removal — session valid but member row deleted → all 403
//   7. Cross-organization access — user from org A tries supplier in org B → 404
//
// Pattern: mirrors existing route.test.ts (vi.hoisted + vi.mock + in-memory store)
//
// UPDATED for Issue #2 (resolveSupplierAccess(db, authCtx) signature):
//   - valtrioxTeamMember.findUnique → findFirst
//   - organizationMember.findFirst returns { role, roleDef: { name, permissions } | null }
//   - Test 4 rewritten: new RBAC uses canonical `operations` key for BOTH read
//     and write; write prevention now comes from isReadOnlyRole(roleName)
//     which is true only for "viewer". So "read without write" is expressed
//     via a viewer-named custom roleDef (roleDef.name === member.role === "viewer").

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES + TEST STATE
// ─────────────────────────────────────────────────────────────────────────────

type SupplierRecord = {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  status: string;
  address: string | null;
  notes: string | null;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type RoleDefRecord = {
  id: string;
  name: string;
  permissions: string; // JSON string
};

type MemberRecord = {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  roleId: string | null;
  penaltyUntil: Date | null;
  roleDef: RoleDefRecord | null;
};

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "brand_owner",
  /** User.role from database (for platform role tests). */
  userRole: null as string | null,
  /** If false, organization.findUnique returns null. */
  orgExists: true,
  /** If set, OrganizationMember.findFirst returns null (simulates removal). */
  memberRemoved: false,
  /** Override the member's DB role (independent from session `role`). */
  memberRoleOverride: null as string | null,
  /** Override the member's roleId (for custom-role tests). */
  memberRoleIdOverride: null as string | null,
  /** Map of roleId → Role row (with permissions JSON). */
  roles: {} as Record<string, RoleDefRecord>,
  /** If set, member has active penalty until this date (B01 penalty tests). */
  penaltyUntil: null as Date | null,
  suppliers: [] as SupplierRecord[],
}));

// ─────────────────────────────────────────────────────────────────────────────
// DB MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const dbMocks = vi.hoisted(() => {
  const matchesWhere = (
    supplier: SupplierRecord,
    where: Record<string, unknown>,
  ): boolean => {
    if (
      where.organizationId !== undefined &&
      supplier.organizationId !== where.organizationId
    )
      return false;
    if (where.id !== undefined && supplier.id !== where.id) return false;
    if (where.status !== undefined && supplier.status !== where.status)
      return false;
    // Handle rating filter: { not: null } and { not: null, lt: N }
    if (where.rating !== undefined && typeof where.rating === "object") {
      const ratingFilter = where.rating as { not?: null; lt?: number };
      if (ratingFilter.not === null && supplier.rating === null) return false;
      if (ratingFilter.lt !== undefined) {
        if (supplier.rating === null) return false;
        if (supplier.rating >= ratingFilter.lt) return false;
      }
    }
    return true;
  };

  const supplier = {
    findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      testState.suppliers.filter((s) => matchesWhere(s, where)),
    ),
    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
      testState.suppliers.filter((s) => matchesWhere(s, where)).length,
    ),
    findFirst: vi.fn(
      async ({
        where,
        select,
        orderBy,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
        orderBy?: Record<string, "asc" | "desc">;
      }) => {
        const filtered = testState.suppliers.filter((s) => matchesWhere(s, where));
        // Handle orderBy: { rating: "desc", updatedAt: "desc" }
        if (orderBy) {
          filtered.sort((a, b) => {
            for (const [field, dir] of Object.entries(orderBy)) {
              const aVal = (a as unknown as Record<string, unknown>)[field];
              const bVal = (b as unknown as Record<string, unknown>)[field];
              if (aVal === bVal) continue;
              // null sorts last in desc, first in asc
              if (aVal === null) return dir === "desc" ? 1 : -1;
              if (bVal === null) return dir === "desc" ? -1 : 1;
              if (dir === "desc") {
                return (bVal as number) - (aVal as number);
              }
              return (aVal as number) - (bVal as number);
            }
            return 0;
          });
        }
        const found = filtered[0];
        if (!found) return null;
        if (select) {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            picked[key] = (found as unknown as Record<string, unknown>)[key];
          }
          return picked;
        }
        return found;
      },
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const s: SupplierRecord = {
        id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organizationId: data.organizationId as string,
        name: data.name as string,
        contactPerson: (data.contactPerson as string) ?? null,
        email: (data.email as string) ?? null,
        phone: (data.phone as string) ?? null,
        category: (data.category as string) ?? "General",
        status: (data.status as string) ?? "active",
        address: (data.address as string) ?? null,
        notes: (data.notes as string) ?? null,
        rating: (data.rating as number | null) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      testState.suppliers.push(s);
      return s;
    }),
    // FIX: route now uses updateMany (Issue #9 TOCTOU) instead of update.
    updateMany: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string; organizationId?: string };
        data: Record<string, unknown>;
      }) => {
        const idx = testState.suppliers.findIndex(
          (s) =>
            s.id === where.id &&
            (where.organizationId === undefined ||
              s.organizationId === where.organizationId),
        );
        if (idx === -1) return { count: 0 };
        testState.suppliers[idx] = {
          ...testState.suppliers[idx],
          ...data,
          updatedAt: new Date(),
        } as SupplierRecord;
        return { count: 1 };
      },
    ),
    deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const before = testState.suppliers.length;
      testState.suppliers = testState.suppliers.filter(
        (s) => !matchesWhere(s, where),
      );
      return { count: before - testState.suppliers.length };
    }),
    aggregate: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const filtered = testState.suppliers.filter((s) => matchesWhere(s, where));
      const ratings = filtered
        .map((s) => s.rating)
        .filter((r): r is number => r !== null);
      const avg = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;
      return {
        _avg: { rating: avg },
        _count: { _all: filtered.length },
      };
    }),
  };

  // ── OrganizationMember mock ──
  // Returns shape that matches resolveSupplierAccess select:
  //   select: { role: true, roleDef: { select: { name, permissions } } }
  const organizationMember = {
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { userId?: string; organizationId?: string };
      }) => {
        if (testState.memberRemoved) return null;
        if (!testState.organizationId) return null;
        if (where.organizationId !== testState.organizationId) return null;
        if (where.userId !== "user-a") return null;

        // Resolve roleDef (if roleId is set)
        const roleId = testState.memberRoleIdOverride;
        const roleDef =
          roleId && testState.roles[roleId]
            ? testState.roles[roleId]
            : null;

        const member: MemberRecord = {
          id: "member-1",
          userId: "user-a",
          organizationId: testState.organizationId,
          role: testState.memberRoleOverride ?? testState.role,
          roleId,
          penaltyUntil: testState.penaltyUntil,
          roleDef,
        };
        return member;
      },
    ),
  };

  // ── ValtrioxTeamMember mock (platform team) — null by default ──
  // FIX: resolveSupplierAccess calls findFirst (not findUnique) with
  //   where: { userId, status: "active" }, select: { id, visibleSections }
    const valtrioxTeamMember = {
    findFirst: vi.fn(
      async (): Promise<{ id: string; visibleSections: string } | null> => null,
    ),
  };

  // Platform role mocks (Phase 5)
  const user = {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      if (where.id === "user-a") {
        return { role: testState.userRole };
      }
      return null;
    }),
  };

  const organization = {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      if (testState.orgExists && where.id === testState.organizationId) {
        return { id: where.id };
      }
      return null;
    }),
  };

  const db = { supplier, organizationMember, valtrioxTeamMember, user, organization };
  return { db, supplier, organizationMember, valtrioxTeamMember };
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE MOCKS
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: <T>(operation: () => T): T => operation(),
  isDbUnavailable: () => false,
  dbErrorResponse: () =>
    new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
    }),
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth:
    (handler: (...args: unknown[]) => unknown) =>
    (req: NextRequest, context?: unknown) =>
      handler(
        req,
        {
          userId: "user-a",
          email: "owner@example.com",
          role: testState.role,
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

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS (after mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/operations/suppliers/route";
import {
  DELETE,
  GET as GET_ID,
  PATCH,
} from "@/app/api/operations/suppliers/[id]/route";
import { GET as GET_STATS } from "@/app/api/operations/suppliers/stats/route";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRequest(queryString = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers${queryString}`,
  );
}

function postRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/operations/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(
  id: string,
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function deleteRequest(id: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers/${id}`,
    { method: "DELETE" },
  );
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}

function seedSupplier(
  organizationId: string,
  overrides: Partial<SupplierRecord> = {},
): SupplierRecord {
  const s: SupplierRecord = {
    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: "Seeded Supplier",
    contactPerson: null,
    email: null,
    phone: null,
    category: "General",
    status: "active",
    address: null,
    notes: null,
    rating: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  testState.suppliers.push(s);
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Issue #2 — Supplier API authorization (DB-resolved)", () => {
  beforeEach(() => {
    // Reset to a sensible default before each test
    testState.organizationId = "org-a";
    testState.role = "brand_owner";
    testState.memberRemoved = false;
    testState.memberRoleOverride = null;
    testState.memberRoleIdOverride = null;
    testState.roles = {};
    testState.penaltyUntil = null;
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. VIEWER — read-only
  // ─────────────────────────────────────────────────────────────────────────
      it("6. stale platform role: session says platform_owner, DB says viewer → treated as viewer", async () => {
      // Session role is "platform_owner" (stale cookie)
      testState.role = "platform_owner";
      // DB user role is "viewer" (fresh reality)
      testState.userRole = "viewer";
      testState.memberRoleOverride = "viewer";
      dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue(null);

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      // Viewer can read but cannot write
      expect(data.access).toMatchObject({ canRead: true, canWrite: false });

      // POST should be blocked
      const postRes = await POST(postRequest({ name: "Blocked" }));
      expect(postRes.status).toBe(403);
    });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. BRAND OWNER — full access
  // ─────────────────────────────────────────────────────────────────────────
  it("brand_owner can GET, POST, PATCH, DELETE", async () => {
    testState.role = "brand_owner";
    testState.memberRoleOverride = "brand_owner";

    // GET list — empty
    const getEmpty = await GET(getRequest());
    expect(getEmpty.status).toBe(200);

    // POST — create
    const postRes = await POST(postRequest({ name: "Acme Corp" }));
    expect(postRes.status).toBe(201);
    const postData = await responseJson(postRes);
    const newId = (postData.supplier as { id: string }).id;

    // PATCH — update
    const patchRes = await PATCH(
      patchRequest(newId, { name: "Acme Inc" }),
      { params: Promise.resolve({ id: newId }) },
    );
    expect(patchRes.status).toBe(200);

    // DELETE — remove
    const delRes = await DELETE(deleteRequest(newId), {
      params: Promise.resolve({ id: newId }),
    });
    expect(delRes.status).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. OPERATIONS MANAGER — full access
  // ─────────────────────────────────────────────────────────────────────────
  it("operations_manager can GET, POST, PATCH, DELETE", async () => {
    testState.role = "operations_manager";
    testState.memberRoleOverride = "operations_manager";

    const getRes = await GET(getRequest());
    expect(getRes.status).toBe(200);

    const postRes = await POST(postRequest({ name: "Ops Supplier" }));
    expect(postRes.status).toBe(201);

    const newId = (await responseJson(postRes)).supplier as { id: string };
    const patchRes = await PATCH(
      patchRequest(newId.id, { name: "Updated" }),
      { params: Promise.resolve({ id: newId.id }) },
    );
    expect(patchRes.status).toBe(200);

    const delRes = await DELETE(deleteRequest(newId.id), {
      params: Promise.resolve({ id: newId.id }),
    });
    expect(delRes.status).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CUSTOM ROLE — viewer-named roleDef with operations:true
  //
  // The new RBAC uses the canonical `operations` permission key for BOTH
  // read and write. Write prevention now comes exclusively from
  // isReadOnlyRole(roleName), which is true only for "viewer".
  //
  // To express "can read, cannot write" via a DB-backed custom roleDef:
  //   - roleDef.name MUST equal member.role (trust condition)
  //   - roleDef.name = "viewer" so isReadOnlyRole returns true → canWrite=false
  //   - permissions = { operations: true } so canRead=true
  // ─────────────────────────────────────────────────────────────────────────
  it("custom roleDef with viewer name + operations:true — can GET, cannot POST", async () => {
    // Set up a custom role in DB: name MUST match member.role ("viewer")
    testState.roles = {
      "role-custom-1": {
        id: "role-custom-1",
        name: "viewer", // matches memberRoleOverride — trust condition passes
        permissions: JSON.stringify({ operations: true }), // canonical key
      },
    };
    testState.memberRoleIdOverride = "role-custom-1";
    testState.memberRoleOverride = "viewer"; // member.role = "viewer"
    dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue(null);
    testState.role = "viewer"; // session role (ignored by resolveSupplierAccess)

    // GET list — should succeed (operations:true → canRead=true)
    const getRes = await GET(getRequest());
    expect(getRes.status).toBe(200);

    // POST — should be blocked (viewer → isReadOnlyRole=true → canWrite=false)
    const postRes = await POST(postRequest({ name: "Blocked" }));
    expect(postRes.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ROLE DEMOTION — session says "admin", DB says "viewer"
  // ─────────────────────────────────────────────────────────────────────────
  it("role demotion: session says admin but DB member is viewer → treated as viewer", async () => {
    // Session claims admin (stale)
    testState.role = "admin";
    // But DB shows viewer (recently demoted)
    testState.memberRoleOverride = "viewer";

    // GET list — viewer can read
    const getRes = await GET(getRequest());
    expect(getRes.status).toBe(200);

    // POST — should be blocked because DB says viewer
    const postRes = await POST(postRequest({ name: "Should Fail" }));
    expect(postRes.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();

    // PATCH — also blocked
    const seeded = seedSupplier("org-a", { name: "Existing" });
    const patchRes = await PATCH(
      patchRequest(seeded.id, { name: "Hacked" }),
      { params: Promise.resolve({ id: seeded.id }) },
    );
    expect(patchRes.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. MEMBERSHIP REMOVAL — session valid but member row deleted
  // ─────────────────────────────────────────────────────────────────────────
  it("membership removal: session valid but member row deleted → all requests 403", async () => {
    testState.role = "brand_owner";
    testState.memberRemoved = true;

    // GET list — blocked
    const getRes = await GET(getRequest());
    expect(getRes.status).toBe(403);

    // GET single — blocked
    const seeded = seedSupplier("org-a", { name: "Existing" });
    const getIdRes = await GET_ID(getRequest(""), {
      params: Promise.resolve({ id: seeded.id }),
    });
    expect(getIdRes.status).toBe(403);

    // POST — blocked
    const postRes = await POST(postRequest({ name: "Blocked" }));
    expect(postRes.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();

    // PATCH — blocked
    const patchRes = await PATCH(
      patchRequest(seeded.id, { name: "Blocked" }),
      { params: Promise.resolve({ id: seeded.id }) },
    );
    expect(patchRes.status).toBe(403);
    // FIX: route uses updateMany now
    expect(dbMocks.supplier.updateMany).not.toHaveBeenCalled();

    // DELETE — blocked
    const delRes = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });
    expect(delRes.status).toBe(403);
    expect(dbMocks.supplier.deleteMany).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CROSS-ORGANIZATION access — user from org A tries supplier in org B
  // ─────────────────────────────────────────────────────────────────────────
  it("cross-org: user from org A cannot read/modify supplier from org B → 404", async () => {
    testState.role = "brand_owner";
    testState.memberRoleOverride = "brand_owner";

    // Seed a supplier in org-b (different org)
    const orgBSupplier = seedSupplier("org-b", { name: "Other Org's Supplier" });

    // GET single — 404 (existence hidden, not 403)
    const getIdRes = await GET_ID(getRequest(""), {
      params: Promise.resolve({ id: orgBSupplier.id }),
    });
    expect(getIdRes.status).toBe(404);

    // PATCH — 404
    const patchRes = await PATCH(
      patchRequest(orgBSupplier.id, { name: "Hacked" }),
      { params: Promise.resolve({ id: orgBSupplier.id }) },
    );
    expect(patchRes.status).toBe(404);
    // FIX: route uses updateMany now — and it IS called (with org-a scope)
    // but count=0 → 404. We don't assert "not called" here because the route
    // always calls updateMany; the safety comes from the org-scoped where.
    // Instead, verify the org-b supplier was NOT modified:
    expect(testState.suppliers[0].name).toBe("Other Org's Supplier");

    // DELETE — 404
    const delRes = await DELETE(deleteRequest(orgBSupplier.id), {
      params: Promise.resolve({ id: orgBSupplier.id }),
    });
    expect(delRes.status).toBe(404);

    // deleteMany IS called — but scoped to the user's org (org-a), so it
    // matches nothing and returns count:0. The route then returns 404.
    // This proves the route NEVER tries to delete without org scoping.
    expect(dbMocks.supplier.deleteMany).toHaveBeenCalledWith({
      where: { id: orgBSupplier.id, organizationId: "org-a" },
    });

    // Critical: org-b supplier must STILL exist (was not deleted)
    expect(testState.suppliers.length).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BONUS: access field is returned in responses for UI rendering
  // ─────────────────────────────────────────────────────────────────────────
  it("GET list returns access.canRead and access.canWrite for UI", async () => {
    testState.role = "brand_owner";
    testState.memberRoleOverride = "brand_owner";

    const res = await GET(getRequest());
    const data = await responseJson(res);
    expect(data.access).toMatchObject({ canRead: true, canWrite: true });
  });

  it("GET list as viewer returns access.canWrite=false", async () => {
    testState.role = "viewer";
    testState.memberRoleOverride = "viewer";

    const res = await GET(getRequest());
    const data = await responseJson(res);
    expect(data.access).toMatchObject({ canRead: true, canWrite: false });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // B07 ACTUAL STATS ROUTE TESTS (G04)
  // Verifies the /api/operations/suppliers/stats endpoint directly,
  // not just resolveSupplierAccess helper.
  // ─────────────────────────────────────────────────────────────────────────
  describe("B07 actual stats route — /api/operations/suppliers/stats", () => {
    beforeEach(() => {
      testState.organizationId = "org-a";
      testState.role = "brand_owner";
      testState.memberRoleOverride = "brand_owner";
      testState.memberRemoved = false;
      testState.memberRoleIdOverride = null;
      testState.memberRoleOverride = null;
      testState.roles = {};
      testState.suppliers.length = 0;
      vi.clearAllMocks();
    });

    it("brand_owner can GET stats with correct shape", async () => {
      testState.role = "brand_owner";
      testState.memberRoleOverride = "brand_owner";
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });
      seedSupplier("org-a", { name: "Sup 2", rating: 5 });
      seedSupplier("org-a", { name: "Sup 3", rating: null });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);

      expect(data.totalSuppliers).toBe(3);
      expect(data.ratedCount).toBe(2);
      expect(data.avgRating).toBe(4.5);
      expect(data.topPerformer).toMatchObject({ name: "Sup 2", rating: 5 });
      expect(data.needsAttentionCount).toBe(0);
      expect(data.access).toMatchObject({ canRead: true, canWrite: true });
    });

    it("viewer can GET stats (read-only access)", async () => {
      testState.role = "viewer";
      testState.memberRoleOverride = "viewer";
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      expect(data.access).toMatchObject({ canRead: true, canWrite: false });
    });

    it("returns null avgRating when no rated suppliers exist", async () => {
      seedSupplier("org-a", { name: "Sup 1", rating: null });
      seedSupplier("org-a", { name: "Sup 2", rating: null });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);

      expect(data.totalSuppliers).toBe(2);
      expect(data.ratedCount).toBe(0);
      expect(data.avgRating).toBeNull();
      expect(data.topPerformer).toBeNull();
      expect(data.needsAttentionCount).toBe(0);
    });

    it("counts needsAttention when ratings below 3", async () => {
      seedSupplier("org-a", { name: "Sup 1", rating: 1 });
      seedSupplier("org-a", { name: "Sup 2", rating: 2 });
      seedSupplier("org-a", { name: "Sup 3", rating: 5 });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);

      expect(data.totalSuppliers).toBe(3);
      expect(data.ratedCount).toBe(3);
      expect(data.needsAttentionCount).toBe(2);
      expect(data.topPerformer).toMatchObject({ name: "Sup 3", rating: 5 });
    });

    it("returns 403 when membership removed", async () => {
      testState.memberRemoved = true;
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(403);
      const data = await responseJson(res);
      expect(data.error).toBeDefined();
    });

    it("returns 403 when no organizationId in session", async () => {
      testState.organizationId = undefined;
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(403);
    });

    it("only counts suppliers from user's organization (org isolation)", async () => {
      seedSupplier("org-a", { name: "My Sup", rating: 4 });
      seedSupplier("org-b", { name: "Other Sup", rating: 5 });

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);

      expect(data.totalSuppliers).toBe(1);
      expect(data.ratedCount).toBe(1);
      expect(data.avgRating).toBe(4);
      expect(data.topPerformer).toMatchObject({ name: "My Sup", rating: 4 });
    });

    it("returns topPerformer with highest rating (ties broken by updatedAt)", async () => {
      const older = seedSupplier("org-a", { name: "Older Sup", rating: 5 });
      older.updatedAt = new Date("2024-01-01");
      const newer = seedSupplier("org-a", { name: "Newer Sup", rating: 5 });
      newer.updatedAt = new Date("2024-06-01");

      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(200);
      const data = await responseJson(res);

      expect(data.topPerformer).toMatchObject({ name: "Newer Sup", rating: 5 });
    });
  });
    // ─────────────────────────────────────────────────────────────────────────
  // Phase 5: Platform role Option B — 8 safeguards
  // ─────────────────────────────────────────────────────────────────────────
  describe("Platform role Option B — 8 safeguards", () => {
    beforeEach(() => {
      testState.organizationId = "org-a";
      testState.role = "brand_owner";
      testState.userRole = null; // default: no platform role
      testState.orgExists = true;
      testState.memberRemoved = false;
      testState.memberRoleOverride = null;
      testState.memberRoleIdOverride = null;
      testState.roles = {};
      testState.penaltyUntil = null;
      testState.suppliers.length = 0;
      vi.clearAllMocks();
      // B-fix v2: Default to active ValtrioxTeamMember with no hidden sections.
      // Platform roles now REQUIRE an active VTM record (revocation-safe).
      // Individual tests can override with mockResolvedValue(null) for
      // inactive/missing scenarios (e.g. test #7).
      dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue({
        id: "vt-default",
        visibleSections: JSON.stringify([]),
      });
    });

    it("1. platform_owner with membership: full read/write access", async () => {
      testState.userRole = "platform_owner";
      testState.memberRoleOverride = "viewer"; // membership role doesn't matter for platform owners

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      expect(data.access).toMatchObject({ canRead: true, canWrite: true });
    });

    it("2. platform_owner without membership: full read/write access (transcends org)", async () => {
      testState.userRole = "platform_owner";
      testState.memberRemoved = true; // no membership row

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      expect(data.access).toMatchObject({ canRead: true, canWrite: true });
    });

    it("3. platform_admin with membership: full read/write access", async () => {
      testState.userRole = "platform_admin";
      testState.memberRoleOverride = "viewer";

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      expect(data.access).toMatchObject({ canRead: true, canWrite: true });
    });

    it("4. platform_admin without membership: full read/write access", async () => {
      testState.userRole = "platform_admin";
      testState.memberRemoved = true;

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      expect(data.access).toMatchObject({ canRead: true, canWrite: true });
    });

    it("5. platform_owner with Valtriox hidden 'suppliers' section → access denied (fail-closed)", async () => {
      testState.userRole = "platform_owner";
      testState.memberRoleOverride = "brand_owner";

      // Mock active Valtriox team member with hidden suppliers section
      const mockVt = dbMocks.valtrioxTeamMember;
      mockVt.findFirst.mockImplementation(async () => ({
        id: "vt-1",
        visibleSections: JSON.stringify(["suppliers"]),
      }));

      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      const data = await responseJson(res);
      expect(data.error).toMatch(/permission/i);

      // Clean up mock for other tests
      mockVt.findFirst.mockReset();
    });

    it("6. stale platform role: session says platform_owner, DB says viewer → treated as viewer", async () => {
      // Session role is "platform_owner" (stale cookie)
      testState.role = "platform_owner";
      // DB user role is "viewer" (fresh reality)
      testState.userRole = "viewer";
      testState.memberRoleOverride = "viewer";
      dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue(null);

      const res = await GET(getRequest());
      expect(res.status).toBe(200);
      const data = await responseJson(res);
      // Viewer can read but cannot write
      expect(data.access).toMatchObject({ canRead: true, canWrite: false });

      // POST should be blocked
      const postRes = await POST(postRequest({ name: "Blocked" }));
      expect(postRes.status).toBe(403);
    });

    it("7. inactive Valtriox team record: platform role DENIED (fail-closed revocation)", async () => {
      testState.userRole = "platform_owner";
      testState.memberRoleOverride = "brand_owner";

      // Valtriox team member exists but status is NOT "active" (so findFirst returns null).
      // B-fix v2: Platform roles REQUIRE active VTM — missing/inactive = 403.
      const mockVt = dbMocks.valtrioxTeamMember;
      mockVt.findFirst.mockResolvedValue(null); // inactive/missing

      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      const data = await responseJson(res);
      expect(data.error).toMatch(/permission/i);

      mockVt.findFirst.mockReset();
    });

    it("8. missing organization: platform owner still denied if orgId missing (Safeguard 1)", async () => {
      testState.userRole = "platform_owner";
      testState.organizationId = undefined; // missing org context

      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      const data = await responseJson(res);
      // Error message may vary, just verify it's a 403 with an error
      expect(data.error).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // B01 PENALTY ENFORCEMENT — even platform owners are subject to penalties
  // Expert review point #3: route-level tests for all 5 endpoints + stats.
  // ─────────────────────────────────────────────────────────────────────────
  describe("B01 penalty enforcement — platform_owner with active penalty", () => {
    beforeEach(() => {
      testState.organizationId = "org-a";
      testState.role = "platform_owner";
      testState.userRole = "platform_owner";
      testState.memberRoleOverride = "brand_owner";
      testState.memberRemoved = false;
      testState.penaltyUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
      testState.suppliers.length = 0;
      vi.clearAllMocks();
      // Active VTM (so platform role would be granted if not for penalty)
      dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue({
        id: "vt-1",
        visibleSections: JSON.stringify([]),
      });
    });

    afterEach(() => {
      testState.penaltyUntil = null;
    });

    it("denies GET list with active penalty (403, no DB query)", async () => {
      seedSupplier("org-a", { name: "Sup 1" });
      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.findMany).not.toHaveBeenCalled();
    });

    it("denies GET detail with active penalty (403)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await GET_ID(getRequest(""), {
        params: Promise.resolve({ id: sup.id }),
      });
      expect(res.status).toBe(403);
    });

    it("denies POST create with active penalty (403, no mutation)", async () => {
      const res = await POST(postRequest({ name: "Blocked" }));
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.create).not.toHaveBeenCalled();
    });

    it("denies PATCH update with active penalty (403, no mutation)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await PATCH(
        patchRequest(sup.id, { name: "Hacked" }),
        { params: Promise.resolve({ id: sup.id }) },
      );
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.updateMany).not.toHaveBeenCalled();
    });

    it("denies DELETE with active penalty (403, no mutation)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await DELETE(deleteRequest(sup.id), {
        params: Promise.resolve({ id: sup.id }),
      });
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.deleteMany).not.toHaveBeenCalled();
    });

    it("denies GET stats with active penalty (403)", async () => {
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });
      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(403);
    });

    it("allows access after penalty expires", async () => {
      testState.penaltyUntil = new Date(Date.now() - 1000); // expired
      const res = await GET(getRequest());
      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // B-FIX v2: Option B revocation — platform role without active VTM = 403
  // Expert review point #4: deactivation/deletion must immediately revoke.
  // ─────────────────────────────────────────────────────────────────────────
  describe("B-fix v2 — Option B revocation (platform role without active VTM)", () => {
    beforeEach(() => {
      testState.organizationId = "org-a";
      testState.role = "platform_owner";
      testState.userRole = "platform_owner";
      testState.memberRoleOverride = "brand_owner";
      testState.memberRemoved = false;
      testState.penaltyUntil = null;
      testState.suppliers.length = 0;
      vi.clearAllMocks();
      // No active ValtrioxTeamMember (deactivated/deleted)
      dbMocks.valtrioxTeamMember.findFirst.mockResolvedValue(null);
    });

    it("denies GET list when VTM inactive (403, no DB query)", async () => {
      seedSupplier("org-a", { name: "Sup 1" });
      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.findMany).not.toHaveBeenCalled();
    });

    it("denies GET detail when VTM inactive (403)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await GET_ID(getRequest(""), {
        params: Promise.resolve({ id: sup.id }),
      });
      expect(res.status).toBe(403);
    });

    it("denies POST create when VTM inactive (403, no mutation)", async () => {
      const res = await POST(postRequest({ name: "Blocked" }));
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.create).not.toHaveBeenCalled();
    });

    it("denies PATCH update when VTM inactive (403, no mutation)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await PATCH(
        patchRequest(sup.id, { name: "Hacked" }),
        { params: Promise.resolve({ id: sup.id }) },
      );
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.updateMany).not.toHaveBeenCalled();
    });

    it("denies DELETE when VTM inactive (403, no mutation)", async () => {
      const sup = seedSupplier("org-a", { name: "Sup 1" });
      const res = await DELETE(deleteRequest(sup.id), {
        params: Promise.resolve({ id: sup.id }),
      });
      expect(res.status).toBe(403);
      expect(dbMocks.supplier.deleteMany).not.toHaveBeenCalled();
    });

    it("denies GET stats when VTM inactive (403)", async () => {
      seedSupplier("org-a", { name: "Sup 1", rating: 4 });
      const res = await GET_STATS(getRequest("/stats"));
      expect(res.status).toBe(403);
    });
  });
});
