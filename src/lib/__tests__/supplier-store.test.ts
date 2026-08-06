// src/lib/__tests__/supplier-store.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for supplier-store.ts (PR #6: Suppliers persistence)
// ─────────────────────────────────────────────────────────────────────────────
//
// Covers team-member review requirements:
//   - Permission helpers: viewer/member read-only (canWriteSuppliers → false)
//   - Invalid ratings: 0, 6, -1, 3.5, "5" all rejected
//   - Rating null for clearing: createSupplierSchema + updateSupplierSchema
//   - Rating tri-state on update: set (5), clear (null), omit (undefined)
//
// No DB mocking needed — these are pure function tests against Zod schemas
// and permission helpers.

import { describe, it, expect } from "vitest";
import {
  canReadSuppliers,
  canWriteSuppliers,
  createSupplierSchema,
  updateSupplierSchema,
  SUPPLIER_STATUSES,
} from "@/lib/supplier-store";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

describe("canReadSuppliers", () => {
  it("returns true for all authenticated org roles", () => {
    expect(canReadSuppliers("owner")).toBe(true);
    expect(canReadSuppliers("admin")).toBe(true);
    expect(canReadSuppliers("manager")).toBe(true);
    expect(canReadSuppliers("member")).toBe(true);
    expect(canReadSuppliers("viewer")).toBe(true);
    expect(canReadSuppliers("staff")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(canReadSuppliers("Owner")).toBe(true);
    expect(canReadSuppliers("ADMIN")).toBe(true);
    expect(canReadSuppliers("Viewer")).toBe(true);
  });

  it("returns false for unknown roles", () => {
    expect(canReadSuppliers("superuser")).toBe(false);
    expect(canReadSuppliers("guest")).toBe(false);
    expect(canReadSuppliers("")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(canReadSuppliers(null)).toBe(false);
    expect(canReadSuppliers(undefined)).toBe(false);
  });
});

describe("canWriteSuppliers", () => {
  it("returns true for owner, admin, manager", () => {
    expect(canWriteSuppliers("owner")).toBe(true);
    expect(canWriteSuppliers("admin")).toBe(true);
    expect(canWriteSuppliers("manager")).toBe(true);
  });

  it("returns false for viewer, member, staff (read-only)", () => {
    // Team-member review: "Viewer accounts must remain read-only."
    expect(canWriteSuppliers("viewer")).toBe(false);
    expect(canWriteSuppliers("member")).toBe(false);
    expect(canWriteSuppliers("staff")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(canWriteSuppliers("Owner")).toBe(true);
    expect(canWriteSuppliers("Manager")).toBe(true);
    expect(canWriteSuppliers("Viewer")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(canWriteSuppliers(null)).toBe(false);
    expect(canWriteSuppliers(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

describe("createSupplierSchema", () => {
  describe("valid inputs", () => {
    it("accepts minimal valid input (only name)", () => {
      const result = createSupplierSchema.safeParse({ name: "Acme Corp" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Acme Corp");
        expect(result.data.category).toBe("General"); // default
        expect(result.data.status).toBe("active"); // default
        expect(result.data.rating).toBeUndefined(); // not provided
      }
    });

    it("accepts full valid input with rating 1-5", () => {
      const result = createSupplierSchema.safeParse({
        name: "Acme Corp",
        contactPerson: "John Doe",
        email: "sales@acme.com",
        phone: "+1-555-0100",
        category: "Packaging",
        status: "active",
        address: "123 Industrial Way",
        notes: "Primary packaging supplier",
        rating: 5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts rating of 1 (minimum)", () => {
      const result = createSupplierSchema.safeParse({
        name: "Low Rated Supplier",
        rating: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts null rating (unrated at creation)", () => {
      const result = createSupplierSchema.safeParse({
        name: "New Supplier",
        rating: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rating).toBeNull();
      }
    });

    it("accepts omitted rating (undefined)", () => {
      const result = createSupplierSchema.safeParse({
        name: "New Supplier",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rating).toBeUndefined();
      }
    });

    it("normalizes empty email string to null", () => {
      const result = createSupplierSchema.safeParse({
        name: "Acme",
        email: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeNull();
      }
    });

    it("lowercases and trims email", () => {
      const result = createSupplierSchema.safeParse({
        name: "Acme",
        email: "  Sales@Acme.COM  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("sales@acme.com");
      }
    });

    it("accepts all valid status values", () => {
      for (const status of SUPPLIER_STATUSES) {
        const result = createSupplierSchema.safeParse({
          name: "Test",
          status,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty name", () => {
      const result = createSupplierSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing name", () => {
      const result = createSupplierSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 200 characters", () => {
      const result = createSupplierSchema.safeParse({
        name: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    // ── Team-member review: "Invalid ratings" ──
    it("rejects rating of 0 (below minimum)", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        rating: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects rating of 6 (above maximum)", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        rating: 6,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative rating", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        rating: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer rating (3.5)", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        rating: 3.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects string rating even if numeric", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        rating: "5",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status value", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        status: "deleted",
      });
      expect(result.success).toBe(false);
    });

    it("rejects phone exceeding 50 characters", () => {
      const result = createSupplierSchema.safeParse({
        name: "Test",
        phone: "1".repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SCHEMA — Rating Tri-State (CRITICAL)
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the most important test block — it verifies the tri-state semantics
// that the team-member review explicitly required:
//   { rating: 5 }      → set rating to 5
//   { rating: null }   → clear rating (set to NULL in DB)
//   rating omitted     → leave rating unchanged
//
// Zod's .optional().nullable() preserves the distinction between null and
// undefined, which Prisma translates to "set NULL" vs "skip field".

describe("updateSupplierSchema — rating tri-state", () => {
  it("preserves rating=5 as a set operation", () => {
    const result = updateSupplierSchema.safeParse({ rating: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(5);
      // Critical: must be 5, NOT null or undefined
      expect(result.data.rating).not.toBeNull();
      expect(result.data.rating).not.toBeUndefined();
    }
  });

  it("preserves rating=null as a clear operation", () => {
    // Team-member review: "null for clearing a rating"
    const result = updateSupplierSchema.safeParse({ rating: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBeNull();
      // Critical: must be null, NOT undefined (which would mean "skip")
      expect(result.data.rating).not.toBeUndefined();
    }
  });

  it("preserves omitted rating as undefined (leave unchanged)", () => {
    const result = updateSupplierSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBeUndefined();
      // Critical: must be undefined, NOT null (which would mean "clear")
      expect(result.data.rating).not.toBeNull();
    }
  });

  it("distinguishes null from undefined in the same parse", () => {
    // When rating is explicitly null
    const withNull = updateSupplierSchema.safeParse({ rating: null });
    if (withNull.success) {
      expect(withNull.data.rating).toBeNull();
    }

    // When rating is omitted
    const withoutRating = updateSupplierSchema.safeParse({ name: "X" });
    if (withoutRating.success) {
      expect(withoutRating.data.rating).toBeUndefined();
    }
  });
});

describe("updateSupplierSchema — validation", () => {
  it("rejects empty update body", () => {
    const result = updateSupplierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts partial update with only name", () => {
    const result = updateSupplierSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    const result = updateSupplierSchema.safeParse({ status: "inactive" });
    expect(result.success).toBe(true);
  });

  // ── Invalid ratings on update ──
  it("rejects rating of 0 on update", () => {
    const result = updateSupplierSchema.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects rating of 6 on update", () => {
    const result = updateSupplierSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rating on update", () => {
    const result = updateSupplierSchema.safeParse({ rating: 4.5 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status on update", () => {
    const result = updateSupplierSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts multiple fields in one update", () => {
    const result = updateSupplierSchema.safeParse({
      name: "New Name",
      rating: 4,
      status: "active",
      notes: "Updated notes",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.rating).toBe(4);
      expect(result.data.status).toBe("active");
    }
  });

  it("normalizes empty email to null on update", () => {
    const result = updateSupplierSchema.safeParse({ email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
    }
  });
});