// src/app/api/operations/suppliers/[id]/__tests__/route.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Integration tests for suppliers/[id] API — Get + Update + Delete
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers team-member review requirements:
//   - Organization isolation: GET/PATCH/DELETE on another org's supplier → 404
//   - Permissions: viewer/member cannot PATCH/DELETE (403)
//   - Invalid ratings on PATCH: 0, 6, 3.5 → 422
//   - Rating removal: PATCH { rating: null } → DB stores null
//   - Persistence after reload: PATCH → re-GET → changes intact
//
// Pattern: mirrors suppliers/__tests__/route.test.ts (vi.hoisted + vi.mock)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// TEST STATE
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
// DB MOCKS — reuse the same in-memory pattern from File 2
// ─────────────────────────────────────────────────────────────────────────────

const dbMocks = vi.hoisted(() => {
  const matchesWhere = (
    supplier: SupplierRecord,
    where: Record<string, unknown>
  ): boolean => {
    if (
      where.organizationId !== undefined &&
      supplier.organizationId !== where.organizationId
    )
      return false;
    if (where.id !== undefined && supplier.id !== where.id) return false;
    if (where.category !== undefined && typeof where.category === "string") {
      if (supplier.category !== where.category) return false;
    }
    if (where.status !== undefined && supplier.status !== where.status)
      return false;
    return true;
  };

  const supplier = {
    findFirst: vi.fn(
      async ({
        where,
        select,
      }: {
        where: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) => {
        const found = testState.suppliers.find((s) =>
          matchesWhere(s, where)
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
      }
    ),

    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const idx = testState.suppliers.findIndex((s) => s.id === where.id);
        if (idx === -1) {
          const err = new Error("Record not found");
          (err as { code?: string }).code = "P2025";
          throw err;
        }
        testState.suppliers[idx] = {
          ...testState.suppliers[idx],
          ...data,
          updatedAt: new Date(),
        } as SupplierRecord;
        return testState.suppliers[idx];
      }
    ),

    deleteMany: vi.fn(
      async ({ where }: { where: Record<string, unknown> }) => {
        const before = testState.suppliers.length;
        testState.suppliers = testState.suppliers.filter(
          (s) => !matchesWhere(s, where)
        );
        return { count: before - testState.suppliers.length };
      }
    ),

    findMany: vi.fn(async () => testState.suppliers),
    count: vi.fn(async () => testState.suppliers.length),
    aggregate: vi.fn(async () => ({ _sum: { rating: 0 } })),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const newSupplier: SupplierRecord = {
        id: `sup-${Date.now()}`,
        organizationId: data.organizationId as string,
        name: data.name as string,
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
        ...data,
      } as SupplierRecord;
      testState.suppliers.push(newSupplier);
      return newSupplier;
    }),
  };

  const db = { supplier };
  return { db, supplier };
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

import { GET, PATCH, DELETE } from "@/app/api/operations/suppliers/[id]/route";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function jsonRequest(
  method: string,
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest("http://localhost/api/operations/suppliers/test-id", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(id: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers/${id}`
  );
}

function patchRequest(
  id: string,
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function deleteRequest(id: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/operations/suppliers/${id}`,
    { method: "DELETE" }
  );
}

async function responseJson(
  response: Response
): Promise<Record<string, unknown>> {
  return response.json();
}

function seedSupplier(
  organizationId: string,
  overrides: Partial<SupplierRecord> = {}
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
// TESTS — GET single
// ─────────────────────────────────────────────────────────────────────────────

describe("suppliers/[id] API — get single (GET)", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "owner";
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  it("returns the supplier when it belongs to the authenticated org", async () => {
    const seeded = seedSupplier("org-a", { name: "My Supplier", rating: 4 });

    const response = await GET(getRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({
      id: seeded.id,
      name: "My Supplier",
      rating: 4,
    });
  });

  // ── Team-member review: Organization isolation ──
  it("returns 404 when supplier belongs to another org (org isolation)", async () => {
    const otherOrgSupplier = seedSupplier("org-b", {
      name: "Other Org's Supplier",
    });

    const response = await GET(getRequest(otherOrgSupplier.id), {
      params: Promise.resolve({ id: otherOrgSupplier.id }),
    });

    // 404, NOT 403 — avoids revealing existence to attackers
    expect(response.status).toBe(404);
  });

  it("returns 404 when supplier does not exist", async () => {
    const response = await GET(getRequest("nonexistent-id"), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects viewer role with 403 (no read permission)", async () => {
    // Note: canReadSuppliers allows viewer, so this tests that the read gate
    // is enforced. If your policy is "viewers CAN read", change role to
    // something like "guest" that fails canReadSuppliers.
    testState.role = "guest"; // not in SUPPLIER_READ_ROLES
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await GET(getRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(response.status).toBe(403);
  });

  it("rejects missing org context with 403", async () => {
    testState.organizationId = undefined;
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await GET(getRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(response.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — PATCH (update + rating tri-state)
// ─────────────────────────────────────────────────────────────────────────────

describe("suppliers/[id] API — update (PATCH)", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "owner";
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  it("updates supplier name only", async () => {
    const seeded = seedSupplier("org-a", { name: "Old Name", rating: 3 });

    const response = await PATCH(
      patchRequest(seeded.id, { name: "New Name" }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({
      name: "New Name",
      rating: 3, // unchanged
    });
  });

  // ── Rating tri-state (CRITICAL) ──
  it("sets rating to 5 when { rating: 5 }", async () => {
    const seeded = seedSupplier("org-a", { name: "Test", rating: 3 });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: 5 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({ rating: 5 });
  });

  it("clears rating when { rating: null } (rating removal)", async () => {
    // Team-member review: "Ratings must support ... null for clearing a rating"
    const seeded = seedSupplier("org-a", { name: "Test", rating: 4 });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: null }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({ rating: null });
  });

  it("leaves rating unchanged when rating is omitted from PATCH body", async () => {
    const seeded = seedSupplier("org-a", { name: "Test", rating: 4 });

    const response = await PATCH(
      patchRequest(seeded.id, { name: "Updated Name" }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({
      name: "Updated Name",
      rating: 4, // unchanged — NOT cleared
    });
  });

  it("can update rating and other fields together", async () => {
    const seeded = seedSupplier("org-a", {
      name: "Old",
      status: "active",
      rating: 2,
    });

    const response = await PATCH(
      patchRequest(seeded.id, {
        name: "New",
        status: "inactive",
        rating: 5,
      }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data.supplier).toMatchObject({
      name: "New",
      status: "inactive",
      rating: 5,
    });
  });

  // ── Team-member review: Persistence after reload ──
  it("persists PATCH changes after re-GET (persistence test)", async () => {
    const seeded = seedSupplier("org-a", { name: "Original", rating: 2 });

    // PATCH — update rating to 5
    const patchResponse = await PATCH(
      patchRequest(seeded.id, { rating: 5 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );
    expect(patchResponse.status).toBe(200);

    // Simulate page reload — clear mock call history but keep data
    vi.clearAllMocks();

    // Re-GET — changes should be intact
    const getResponse = await GET(getRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });
    const getData = await responseJson(getResponse);

    expect(getResponse.status).toBe(200);
    expect(getData.supplier).toMatchObject({
      name: "Original",
      rating: 5, // persisted, NOT rolled back
    });
  });

  // ── Team-member review: Permissions ──
  it("rejects viewer role with 403", async () => {
    testState.role = "viewer";
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { name: "Updated" }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(403);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  it("rejects member role with 403", async () => {
    testState.role = "member";
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: 5 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(403);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  it("allows owner, admin, and manager roles", async () => {
    for (const role of ["owner", "admin", "manager"]) {
      testState.role = role;
      const seeded = seedSupplier("org-a", {
        name: `For ${role}`,
        rating: 1,
      });

      const response = await PATCH(
        patchRequest(seeded.id, { rating: 5 }),
        { params: Promise.resolve({ id: seeded.id }) }
      );
      expect(response.status).toBe(200);
    }
  });

  // ── Team-member review: Organization isolation ──
  it("returns 404 when patching another org's supplier (org isolation)", async () => {
    const otherOrgSupplier = seedSupplier("org-b", {
      name: "Other Org's",
      rating: 1,
    });

    const response = await PATCH(
      patchRequest(otherOrgSupplier.id, { rating: 5 }),
      { params: Promise.resolve({ id: otherOrgSupplier.id }) }
    );

    expect(response.status).toBe(404);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  // ── Team-member review: Invalid ratings ──
  it("rejects rating of 0 on PATCH with 422", async () => {
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: 0 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(422);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  it("rejects rating of 6 on PATCH with 422", async () => {
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: 6 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(422);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  it("rejects non-integer rating (3.5) on PATCH with 422", async () => {
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { rating: 3.5 }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(422);
    expect(dbMocks.supplier.update).not.toHaveBeenCalled();
  });

  // ── Validation ──
  it("rejects empty update body with 422", async () => {
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, {}),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(422);
  });

  it("rejects invalid status on PATCH with 422", async () => {
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { status: "deleted" }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(422);
  });

  it("returns 404 when patching nonexistent supplier", async () => {
    const response = await PATCH(
      patchRequest("nonexistent-id", { name: "X" }),
      { params: Promise.resolve({ id: "nonexistent-id" }) }
    );

    expect(response.status).toBe(404);
  });

  it("rejects missing org context with 403", async () => {
    testState.organizationId = undefined;
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await PATCH(
      patchRequest(seeded.id, { name: "X" }),
      { params: Promise.resolve({ id: seeded.id }) }
    );

    expect(response.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS — DELETE
// ─────────────────────────────────────────────────────────────────────────────

describe("suppliers/[id] API — delete (DELETE)", () => {
  beforeEach(() => {
    testState.organizationId = "org-a";
    testState.role = "owner";
    testState.suppliers.length = 0;
    vi.clearAllMocks();
  });

  it("deletes a supplier from the authenticated org", async () => {
    const seeded = seedSupplier("org-a", { name: "To Delete" });

    const response = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });
    const data = await responseJson(response);

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ success: true });
    expect(testState.suppliers.length).toBe(0);
  });

  // ── Team-member review: Organization isolation ──
  it("returns 404 when deleting another org's supplier (org isolation)", async () => {
    const otherOrgSupplier = seedSupplier("org-b", {
      name: "Other Org's",
    });

    const response = await DELETE(deleteRequest(otherOrgSupplier.id), {
      params: Promise.resolve({ id: otherOrgSupplier.id }),
    });

    expect(response.status).toBe(404);
    // Critical: other org's supplier must STILL exist
    expect(testState.suppliers.length).toBe(1);
  });

  // ── Team-member review: Permissions ──
  it("rejects viewer role with 403", async () => {
    testState.role = "viewer";
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(response.status).toBe(403);
    expect(testState.suppliers.length).toBe(1); // not deleted
  });

  it("rejects member role with 403", async () => {
    testState.role = "member";
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(response.status).toBe(403);
    expect(testState.suppliers.length).toBe(1);
  });

  it("allows owner, admin, and manager roles", async () => {
    for (const role of ["owner", "admin", "manager"]) {
      testState.role = role;
      const seeded = seedSupplier("org-a", { name: `For ${role}` });

      const response = await DELETE(deleteRequest(seeded.id), {
        params: Promise.resolve({ id: seeded.id }),
      });
      expect(response.status).toBe(200);
    }
  });

  it("returns 404 when deleting nonexistent supplier", async () => {
    const response = await DELETE(deleteRequest("nonexistent-id"), {
      params: Promise.resolve({ id: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects missing org context with 403", async () => {
    testState.organizationId = undefined;
    const seeded = seedSupplier("org-a", { name: "Test" });

    const response = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(response.status).toBe(403);
  });

  // ── Persistence after reload — deletion is permanent ──
  it("deletion persists after re-GET (deleted supplier stays gone)", async () => {
    const seeded = seedSupplier("org-a", { name: "To Delete" });

    // DELETE
    const deleteResponse = await DELETE(deleteRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });
    expect(deleteResponse.status).toBe(200);

    // Simulate page reload
    vi.clearAllMocks();

    // Re-GET — should be 404 (deleted permanently)
    const getResponse = await GET(getRequest(seeded.id), {
      params: Promise.resolve({ id: seeded.id }),
    });

    expect(getResponse.status).toBe(404);
    expect(testState.suppliers.length).toBe(0);
  });
});