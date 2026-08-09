// src/app/api/operations/suppliers/__tests__/route.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Integration tests for suppliers API — List (GET) + Create (POST)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers team-member review requirements:
//   - Organization isolation: Org A user only sees Org A suppliers
//   - Permissions: viewer/member cannot POST (403)
//   - Invalid ratings: POST with rating 0/6/3.5 → 422
//   - Rating null for clearing: POST with rating=null creates unrated supplier
//   - Persistence after reload: create → re-GET → data intact
//
// Pattern: mirrors __tests__/product-categories.test.ts (vi.hoisted + vi.mock)
//
// UPDATED for Issue #2 (resolveSupplierAccess(db, authCtx) signature):
//   - valtrioxTeamMember.findUnique → findFirst
//   - organizationMember.findFirst returns { role, roleDef: null } (matches select)
//   - No outcome.* patterns — direct access object usage

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// TEST STATE (shared via vi.hoisted so mocks can read it)
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

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "owner",
  suppliers: [] as SupplierRecord[],
}));

// ─────────────────────────────────────────────────────────────────────────────
// DB MOCKS — in-memory supplier table with Prisma-like query semantics
// ─────────────────────────────────────────────────────────────────────────────

const dbMocks = vi.hoisted(() => {
  let idCounter = 0;

  // Match a supplier against a Prisma-like `where` clause.
  // Supports: organizationId, category, status, rating (gte/lte/not null), OR (search)
  const matchesWhere = (
    supplier: SupplierRecord,
    where: Record<string, unknown>,
  ): boolean => {
    if (
      where.organizationId !== undefined &&
      supplier.organizationId !== where.organizationId
    )
      return false;

    if (where.category !== undefined) {
      if (typeof where.category === "string") {
        if (supplier.category !== where.category) return false;
      }
    }

    if (where.status !== undefined && supplier.status !== where.status)
      return false;

    // Rating filter: { not: null, gte?: n, lte?: n }
    if (where.rating !== undefined && where.rating !== null) {
      const r = where.rating as {
        not?: null;
        gte?: number;
        lte?: number;
      };
      if (r.not === null && supplier.rating === null) return false;
      if (r.gte !== undefined) {
        if (supplier.rating === null || supplier.rating < r.gte) return false;
      }
      if (r.lte !== undefined) {
        if (supplier.rating === null || supplier.rating > r.lte) return false;
      }
    }

    // OR (search across name, email, contactPerson, category)
    if (where.OR !== undefined && Array.isArray(where.OR)) {
      const matchesAny = (where.OR as Record<string, unknown>[]).some(
        (condition) => {
          for (const [field, filter] of Object.entries(condition)) {
            const value = (supplier as unknown as Record<string, unknown>)[
              field
            ];
            if (filter && typeof filter === "object") {
              const f = filter as {
                contains?: string;
                mode?: string;
              };
              if (f.contains !== undefined) {
                const target = (value ?? "").toString();
                if (f.mode === "insensitive") {
                  if (
                    !target.toLowerCase().includes(f.contains.toLowerCase())
                  )
                    return false;
                } else {
                  if (!target.includes(f.contains)) return false;
                }
              }
            }
          }
          return true;
        },
      );
      if (!matchesAny) return false;
    }

    return true;
  };

  const supplier = {
    findMany: vi.fn(
      async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where: Record<string, unknown>;
        orderBy?: { createdAt?: "asc" | "desc" };
        skip?: number;
        take?: number;
      }) => {
        let results = testState.suppliers.filter((s) =>
          matchesWhere(s, where),
        );
        if (orderBy?.createdAt === "desc") {
          results = results.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        if (skip !== undefined) results = results.slice(skip);
        if (take !== undefined) results = results.slice(0, take);
        return results;
      },
    ),

    count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      return testState.suppliers.filter((s) => matchesWhere(s, where)).length;
    }),

    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const newSupplier: SupplierRecord = {
        id: `sup-${++idCounter}`,
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
      testState.suppliers.push(newSupplier);
      return newSupplier;
    }),

    aggregate: vi.fn(
      async ({
        where,
        _sum,
      }: {
        where: Record<string, unknown>;
        _sum?: { rating?: boolean };
      }) => {
        const filtered = testState.suppliers.filter((s) =>
          matchesWhere(s, where),
        );
        let sum = 0;
        if (_sum?.rating) {
          sum = filtered.reduce((acc, s) => acc + (s.rating ?? 0), 0);
        }
        return { _sum: { rating: sum } };
      },
    ),

    findFirst: vi.fn(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        const found = testState.suppliers.find((s) =>
          matchesWhere(s, where),
        );
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

    deleteMany: vi.fn(
      async ({ where }: { where: Record<string, unknown> }) => {
        const before = testState.suppliers.length;
        testState.suppliers = testState.suppliers.filter(
          (s) => !matchesWhere(s, where),
        );
        return { count: before - testState.suppliers.length };
      },
    ),
  };

  // ── OrganizationMember mock (used by resolveSupplierAccess helper) ──
  // Returns shape that matches the `select: { role, roleDef }` call.
  // roleDef is null by default — resolveRoleDefinition falls back to
  // getRoleByName(roleName) which uses the canonical ROLES table.
  const organizationMember = {
    findFirst: vi.fn(
      async ({
        where,
      }: {
        where: { userId?: string; organizationId?: string };
      }) => {
        if (!testState.organizationId) return null;
        if (where.organizationId !== testState.organizationId) return null;
        if (where.userId !== "user-a") return null;
        // Match the select shape used by resolveSupplierAccess:
        //   select: { role: true, roleDef: { select: { name, permissions } } }
        return {
          role: testState.role,
          roleDef: null,
        };
      },
    ),
  };

  // ── ValtrioxTeamMember mock (platform team) — null by default ──
  // FIX: resolveSupplierAccess calls findFirst (not findUnique) with
  //   where: { userId, status: "active" }, select: { id, visibleSections }
  const valtrioxTeamMember = {
    findFirst: vi.fn(async () => null),
  };

  const db = { supplier, organizationMember, valtrioxTeamMember };
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
    new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
      status: 503,
    }),
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth:
    (handler: (...args: unknown[]) => unknown) =>
    (req: NextRequest, context?: unknown) =>
      handler(req, {
        userId: "user-a",
        email: "owner@example.com",
        role: testState.role,
        organizationId: testState.organizationId,
      }, context),
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function jsonRequest(
  method: string,
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest("http://localhost/api/operations/suppliers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(queryString = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers${queryString}`,
  );
}

async function responseJson(
  response: Response,
): Promise<Record<string, unknown>> {
  return response.json();
}

function seedSupplier(
  organizationId: string,
  overrides: Partial<SupplierRecord> = {},
): SupplierRecord {
  const supplier: SupplierRecord = {
    id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  testState.suppliers.push(supplier);
  return supplier;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("suppliers API — list (GET)", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "owner";
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  it("returns empty list and zero stats when no suppliers exist", async () => {
    const response = await GET(getRequest());
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.suppliers).toEqual([]);
    expect(data.stats).toMatchObject({
      total: 0,
      active: 0,
      inactive: 0,
      blacklisted: 0,
      ratedCount: 0,
      averageRating: null,
    });
  });

  // ── Team-member review: Organization isolation ──
  it("returns only the authenticated org's suppliers (org isolation)", async () => {
    seedSupplier("org-a", { name: "Org A Supplier 1", rating: 5 });
    seedSupplier("org-a", { name: "Org A Supplier 2", rating: 3 });
    seedSupplier("org-b", { name: "Org B Supplier 1", rating: 4 });

    const response = await GET(getRequest());
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect((data.suppliers as Array<{ name: string }>).length).toBe(2);
    expect(
      (data.suppliers as Array<{ name: string }>).map((s) => s.name),
    ).toEqual(expect.arrayContaining(["Org A Supplier 1", "Org A Supplier 2"]));
    expect(data.stats).toMatchObject({ total: 2 });
  });

  it("rejects platform session without organization context", async () => {
    testState.organizationId = undefined;
    testState.role = "platform_owner";

    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(dbMocks.supplier.findMany).not.toHaveBeenCalled();
  });

  it("applies pagination correctly", async () => {
    for (let i = 0; i < 25; i++) {
      seedSupplier("org-a", { name: `Supplier ${i}` });
    }

    const response = await GET(getRequest("?page=2&limit=10"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect((data.suppliers as unknown[]).length).toBe(10);
    expect(data.pagination).toMatchObject({
      page: 2,
      limit: 10,
      totalCount: 25,
      totalPages: 3,
    });
  });

  it("filters by category", async () => {
    seedSupplier("org-a", { name: "A", category: "Packaging" });
    seedSupplier("org-a", { name: "B", category: "Logistics" });
    seedSupplier("org-a", { name: "C", category: "Packaging" });

    const response = await GET(getRequest("?category=Packaging"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect((data.suppliers as unknown[]).length).toBe(2);
  });

  it("filters by status", async () => {
    seedSupplier("org-a", { name: "A", status: "active" });
    seedSupplier("org-a", { name: "B", status: "inactive" });
    seedSupplier("org-a", { name: "C", status: "active" });

    const response = await GET(getRequest("?status=inactive"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect((data.suppliers as unknown[]).length).toBe(1);
  });

  // ── Rating range filter (null-safe) ──
  it("filters by minRating and excludes null-rated suppliers", async () => {
    seedSupplier("org-a", { name: "Unrated", rating: null });
    seedSupplier("org-a", { name: "Low", rating: 2 });
    seedSupplier("org-a", { name: "High", rating: 5 });

    const response = await GET(getRequest("?minRating=4"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    const names = (data.suppliers as Array<{ name: string }>).map(
      (s) => s.name,
    );
    expect(names).toEqual(["High"]);
    expect(names).not.toContain("Unrated");
  });

  it("filters by maxRating and excludes null-rated suppliers", async () => {
    seedSupplier("org-a", { name: "Unrated", rating: null });
    seedSupplier("org-a", { name: "Low", rating: 2 });
    seedSupplier("org-a", { name: "High", rating: 5 });

    const response = await GET(getRequest("?maxRating=3"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    const names = (data.suppliers as Array<{ name: string }>).map(
      (s) => s.name,
    );
    expect(names).toEqual(["Low"]);
    expect(names).not.toContain("Unrated");
  });

  it("searches across name, email, contactPerson, and category", async () => {
    seedSupplier("org-a", { name: "Acme Corp", email: "sales@acme.com" });
    seedSupplier("org-a", { name: "Beta Inc", contactPerson: "John Acme" });
    seedSupplier("org-a", { name: "Gamma LLC", category: "Packaging" });

    const response = await GET(getRequest("?search=acme"));
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    const names = (data.suppliers as Array<{ name: string }>).map(
      (s) => s.name,
    );
    // Should match "Acme Corp" (name) and "Beta Inc" (contactPerson)
    expect(names).toEqual(expect.arrayContaining(["Acme Corp", "Beta Inc"]));
    expect(names).not.toContain("Gamma LLC");
  });

  it("returns correct stats including averageRating", async () => {
    seedSupplier("org-a", { name: "A", rating: 4 });
    seedSupplier("org-a", { name: "B", rating: 5 });
    seedSupplier("org-a", { name: "C", rating: null }); // unrated
    seedSupplier("org-a", { name: "D", status: "inactive", rating: 3 });

    const response = await GET(getRequest());
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.stats).toMatchObject({
      total: 4,
      active: 3,
      inactive: 1,
      blacklisted: 0,
      ratedCount: 3, // A, B, D (C is null)
      averageRating: 4, // (4 + 5 + 3) / 3 = 4
    });
  });
});

describe("suppliers API — create (POST)", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "owner";
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  it("creates a supplier with minimal data", async () => {
    const response = await POST(jsonRequest("POST", { name: "Acme Corp" }));
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({
      name: "Acme Corp",
      organizationId: "org-a",
      category: "General",
      status: "active",
      rating: null,
    });
  });

  it("creates a supplier with full data including rating", async () => {
    const response = await POST(
      jsonRequest("POST", {
        name: "Acme Corp",
        contactPerson: "John Doe",
        email: "sales@acme.com",
        phone: "+1-555-0100",
        category: "Packaging",
        status: "active",
        address: "123 Industrial Way",
        notes: "Primary packaging supplier",
        rating: 5,
      }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({
      name: "Acme Corp",
      email: "sales@acme.com",
      category: "Packaging",
      rating: 5,
    });
  });

  // ── Team-member review: Persistence after reload ──
  it("persists supplier after re-GET (persistence test)", async () => {
    // Create
    const createResponse = await POST(
      jsonRequest("POST", { name: "Persistent Supplier", rating: 4 }),
    );
    expect(createResponse.status).toBe(201);

    // Simulate a "page reload" by clearing all mock call history
    // (the in-memory array retains the data — just like a real DB)
    vi.clearAllMocks();

    // Re-GET — data should still be there
    const getResponse = await GET(getRequest());
    const getData = await responseJson(getResponse);

    expect(getResponse.status).toBe(200);
    expect((getData.suppliers as Array<{ name: string }>).length).toBe(1);
    expect(getData.suppliers).toMatchObject([
      { name: "Persistent Supplier", rating: 4 },
    ]);
  });

  // ── Team-member review: Viewer accounts read-only ──
  it("rejects viewer role with 403", async () => {
    testState.role = "viewer";
    const response = await POST(jsonRequest("POST", { name: "Blocked" }));

    expect(response.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  it("rejects member role with 403", async () => {
    testState.role = "member";
    const response = await POST(jsonRequest("POST", { name: "Blocked" }));

    expect(response.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  it("allows owner, admin, and manager roles", async () => {
    for (const role of ["owner", "admin", "manager"]) {
      testState.role = role;
      testState.suppliers.length = 0;
      const response = await POST(
        jsonRequest("POST", { name: `Supplier for ${role}` }),
      );
      expect(response.status).toBe(201);
    }
  });

  it("rejects missing org context with 403", async () => {
    testState.organizationId = undefined;
    const response = await POST(jsonRequest("POST", { name: "No Org" }));

    expect(response.status).toBe(403);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  // ── Team-member review: Invalid ratings ──
  it("rejects rating of 0 with 422", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", rating: 0 }),
    );
    expect(response.status).toBe(422);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  it("rejects rating of 6 with 422", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", rating: 6 }),
    );
    expect(response.status).toBe(422);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  it("rejects non-integer rating (3.5) with 422", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", rating: 3.5 }),
    );
    expect(response.status).toBe(422);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  // ── Team-member review: Rating null for clearing ──
  it("accepts null rating (unrated at creation)", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Unrated Supplier", rating: null }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({ rating: null });
  });

  it("accepts omitted rating (defaults to null)", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "No Rating Specified" }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({ rating: null });
  });

  // ── Validation ──
  it("rejects missing name with 422", async () => {
    const response = await POST(jsonRequest("POST", { rating: 5 }));
    expect(response.status).toBe(422);
    expect(dbMocks.supplier.create).not.toHaveBeenCalled();
  });

  it("rejects empty name with 422", async () => {
    const response = await POST(jsonRequest("POST", { name: "" }));
    expect(response.status).toBe(422);
  });

  it("rejects invalid email format with 422", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", email: "not-an-email" }),
    );
    expect(response.status).toBe(422);
  });

  it("normalizes empty email string to null", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", email: "" }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({ email: null });
  });

  it("lowercases and trims email on create", async () => {
    const response = await POST(
      jsonRequest("POST", {
        name: "Test",
        email: "  Sales@Acme.COM  ",
      }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    expect(data.supplier).toMatchObject({ email: "sales@acme.com" });
  });

  it("rejects invalid status with 422", async () => {
    const response = await POST(
      jsonRequest("POST", { name: "Test", status: "deleted" }),
    );
    expect(response.status).toBe(422);
  });

  // ── Org isolation on create ──
  it("always uses orgId from session, never from body", async () => {
    // Even if client tries to pass organizationId in body, it should be ignored
    const response = await POST(
      jsonRequest("POST", {
        name: "Test",
        organizationId: "org-b", // attempt to spoof
      }),
    );
    const data = await responseJson(response);

    expect(response.status).toBe(201);
    // Should be org-a (from session), NOT org-b (from body)
    expect(data.supplier).toMatchObject({ organizationId: "org-a" });
  });
});
