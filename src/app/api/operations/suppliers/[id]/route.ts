// src/app/api/operations/suppliers/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Suppliers API — Single supplier: Get (GET) + Update (PATCH) + Delete (DELETE)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Issue #2 (Authorization hardening — Seasonal Events pattern):
//   - Every request re-resolves OrganizationMember + active ValtrioxTeamMember
//     from the DB via resolveSupplierAccess(db, authCtx).
//   - Uses canonical `operations` permission key.
//   - Cross-org supplier access returns 404 (not 403) to avoid leaking
//     existence — the org-scoped findFirst simply returns null.
//
// Issue #9 (PATCH atomicity):
//   - PATCH uses updateMany with { id, organizationId } scope and checks
//     count > 0 — no time-of-check/time-of-use gap.

import { NextResponse } from "next/server";
import { db, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { updateSupplierSchema } from "@/lib/supplier-store";
import { resolveSupplierAccess } from "@/lib/supplier-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    const id = (await params)?.id as string | undefined;

    try {
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canReadSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to view suppliers" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 },
        );
      }

      const supplier = await withRetry(async () => {
        // Org-scoped query — cross-org access returns null → 404.
        return db.supplier.findFirst({
          where: { id, organizationId: orgId },
        });
      }, 2, 500);

      if (!supplier) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        supplier,
        access: {
          canRead: access.canReadSuppliers,
          canWrite: access.canWriteSuppliers,
        },
      });
    } catch (error: unknown) {
      logger.error("Get supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return NextResponse.json(
          {
            error:
              "Database is currently unavailable. Please try again later.",
            fallback: true,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch supplier" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 60, windowSeconds: 60 },
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    const id = (await params)?.id as string | undefined;

    try {
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canWriteSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to update suppliers" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 },
        );
      }

      const bodyResult = await validateBody(req, updateSupplierSchema);
      if (!bodyResult.success) return bodyResult.response;
      const data = bodyResult.data;

      // Build the update payload, preserving the rating tri-state.
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

      if (data.rating !== undefined) {
        updateData.rating = data.rating; // null or 1-5
      }

      // Issue #9: Atomic org-scoped update — no TOCTOU gap.
      // updateMany with { id, organizationId } scope + check count > 0.
      // Cross-org supplier is never updated (count=0 → 404).
      const result = await withRetry(async () => {
        return db.supplier.updateMany({
          where: { id, organizationId: orgId },
          data: updateData,
        });
      }, 2, 500);

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 },
        );
      }

      // Fetch the updated record to return (still org-scoped).
      const supplier = await withRetry(async () => {
        return db.supplier.findFirst({
          where: { id, organizationId: orgId },
        });
      }, 2, 500);

      return NextResponse.json({
        supplier,
        access: {
          canRead: access.canReadSuppliers,
          canWrite: access.canWriteSuppliers,
        },
      });
    } catch (error: unknown) {
      logger.error("Update supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return NextResponse.json(
          {
            error:
              "Database is currently unavailable. Please try again later.",
            fallback: true,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update supplier" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 },
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/operations/suppliers/[id]
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withRateLimit(
  withAuth(async (req, authCtx, { params }) => {
    const id = (await params)?.id as string | undefined;

    try {
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canWriteSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to delete suppliers" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      if (!id) {
        return NextResponse.json(
          { error: "Supplier ID is required" },
          { status: 400 },
        );
      }

      // Org-scoped delete — cross-org supplier is never deleted (count=0 → 404).
      const result = await withRetry(async () => {
        return db.supplier.deleteMany({
          where: { id, organizationId: orgId },
        });
      }, 2, 500);

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        access: {
          canRead: access.canReadSuppliers,
          canWrite: access.canWriteSuppliers,
        },
      });
    } catch (error: unknown) {
      logger.error("Delete supplier API error", error, {
        orgId: authCtx?.organizationId,
        supplierId: id,
      });
      if (isDbUnavailable(error)) {
        return NextResponse.json(
          {
            error:
              "Database is currently unavailable. Please try again later.",
            fallback: true,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Failed to delete supplier" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 },
);