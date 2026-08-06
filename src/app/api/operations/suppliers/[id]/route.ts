// src/app/api/operations/suppliers/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Suppliers API — Single supplier: Get (GET) + Update (PATCH) + Delete (DELETE)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Team-member review requirements enforced:
//   1. Org isolation — every query filters by BOTH id AND organizationId.
//      A supplier from org A can NEVER be read/modified/deleted by org B,
//      even if they guess the id.
//   2. Rating tri-state on PATCH:
//        { rating: 5 }     → set to 5
//        { rating: null }  → clear (set to NULL in DB)
//        rating omitted    → leave unchanged
//   3. Viewer/member accounts read-only — canWriteSuppliers() gate on PATCH/DELETE.
//   4. 404 returned if supplier not found in the org (never reveal existence
//      across orgs — same 404 for "doesn't exist" and "exists but not yours").
//
// Pattern: mirrors src/app/api/products/route.ts conventions.

import { NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canReadSuppliers,
  canWriteSuppliers,
  updateSupplierSchema,
} from "@/lib/supplier-store";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────
// Fetch a single supplier by ID.
//
// Returns:
//   200 — { supplier }
//   403 — user lacks read permission, or missing org context
//   404 — supplier not found (or belongs to another org)
//   503 — database unavailable
//   500 — unexpected error

export const GET = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    // Next.js 16: params is a Promise — must be awaited before accessing fields.
    // Extracted outside try block so the catch block can also reference `id`.
    const id = (await params)?.id as string | undefined;

    try {
      if (!canReadSuppliers(authCtx.role)) {
        return NextResponse.json(
          { error: "You do not have permission to view suppliers" },
          { status: 403 }
        );
      }

      const orgId = authCtx.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 }
        );
      }

      const supplier = await withRetry(async () => {
        // Org-scoped query — filters by BOTH id AND organizationId.
        // This is the critical isolation check: even if an attacker guesses
        // another org's supplier ID, this query returns null.
        return db.supplier.findFirst({
          where: { id, organizationId: orgId },
        });
      }, 2, 500);

      if (!supplier) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ supplier });
    } catch (error: unknown) {
            logger.error("Get supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return dbErrorResponse(error);
      }
      return NextResponse.json(
        { error: "Failed to fetch supplier" },
        { status: 500 }
      );
    }
  }),
  { maxRequests: 60, windowSeconds: 60 }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────
// Update a supplier. Supports partial updates.
//
// Rating semantics (critical):
//   { rating: 5 }      → set rating to 5
//   { rating: null }   → clear rating (set to NULL in DB)
//   rating omitted     → leave rating unchanged
//
// The Zod schema (updateSupplierSchema) preserves the tri-state via
// .optional().nullable() — null and undefined are distinct in the parsed output.
//
// Returns:
//   200 — { supplier }
//   400 — validation error (e.g. rating out of range, empty update body)
//   403 — viewer/member attempting write, or missing org context
//   404 — supplier not found (or belongs to another org)
//   503 — database unavailable
//   500 — unexpected error

export const PATCH = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    // Next.js 16: params is a Promise — await before accessing fields.
    const id = (await params)?.id as string | undefined;

    try {
      const orgId = authCtx.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }

      if (!canWriteSuppliers(authCtx.role)) {
        return NextResponse.json(
          { error: "Read-only users cannot update suppliers" },
          { status: 403 }
        );
      }

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 }
        );
      }

      // Validate body — updateSupplierSchema enforces:
      //   - all fields optional
      //   - rating: 1-5, null, or undefined (tri-state)
      //   - at least one field must be present (via .refine)
      const bodyResult = await validateBody(req, updateSupplierSchema);
      if (!bodyResult.success) return bodyResult.response;
      const data = bodyResult.data;

      // Pre-check existence in this org before updating.
      // We could rely on updateMany({ where: { id, organizationId } }) returning
      // count=0, but a separate findFirst gives a cleaner 404 and avoids
      // race-condition ambiguity on partial updates.
      const existing = await withRetry(async () => {
        return db.supplier.findFirst({
          where: { id, organizationId: orgId },
          select: { id: true },
        });
      }, 2, 500);

      if (!existing) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 }
        );
      }

      // Build the update payload, preserving the rating tri-state.
      // Zod gives us: undefined = omit, null = clear, number = set.
      // Prisma treats undefined as "skip this field" and null as "set to NULL",
      // so we can pass the parsed object almost directly.
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.contactPerson !== undefined)
        updateData.contactPerson = data.contactPerson || null;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.address !== undefined) updateData.address = data.address || null;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      // Rating tri-state — this is the key logic:
      //   undefined → don't include in update (leave unchanged)
      //   null      → explicitly set to null (clear rating)
      //   number    → set to the number (1-5)
      if (data.rating !== undefined) {
        updateData.rating = data.rating; // null or 1-5
      }

      const supplier = await withRetry(async () => {
        return db.supplier.update({
          where: { id },
          data: updateData,
        });
      }, 2, 500);

      return NextResponse.json({ supplier });
    } catch (error: unknown) {
           logger.error("Update supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return NextResponse.json(
          {
            error: "Database is currently unavailable. Please try again later.",
            fallback: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update supplier" },
        { status: 500 }
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────
// Delete a supplier from the authenticated user's organization.
//
// Returns:
//   200 — { success: true }
//   403 — viewer/member attempting delete, or missing org context
//   404 — supplier not found (or belongs to another org)
//   503 — database unavailable
//   500 — unexpected error

export const DELETE = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    // Next.js 16: params is a Promise — await before accessing fields.
    const id = (await params)?.id as string | undefined;

    try {
      const orgId = authCtx.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }

      if (!canWriteSuppliers(authCtx.role)) {
        return NextResponse.json(
          { error: "Read-only users cannot delete suppliers" },
          { status: 403 }
        );
      }

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 }
        );
      }

      // Org-scoped delete — use deleteMany so that a supplier belonging to
      // another org is never deleted (count=0 → 404).
      const result = await withRetry(async () => {
        return db.supplier.deleteMany({
          where: { id, organizationId: orgId },
        });
      }, 2, 500);

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      logger.error("Delete supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return NextResponse.json(
          {
            error: "Database is currently unavailable. Please try again later.",
            fallback: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Failed to delete supplier" },
        { status: 500 }
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 }
);