// src/app/api/operations/suppliers/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Suppliers API — Single supplier: Get (GET) + Update (PATCH) + Delete (DELETE)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Issue #2 (Authorization hardening):
//   - Every request re-resolves OrganizationMember + Role from the DB via
//     resolveSupplierAccess().
//   - GET response includes `access: { canRead, canWrite }` for UI rendering.
//   - Cross-org supplier access returns 404 (not 403) to avoid leaking
//     existence — the org-scoped findFirst simply returns null.

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
      const outcome = await resolveSupplierAccess(authCtx, {
        requireRead: true,
      });
      if (!outcome.ok) return outcome.response;
      const { access } = outcome;
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
        access: { canRead: access.canRead, canWrite: access.canWrite },
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
      const outcome = await resolveSupplierAccess(authCtx, {
        requireWrite: true,
      });
      if (!outcome.ok) return outcome.response;
      const { access } = outcome;
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

      // Pre-check existence in this org.
      const existing = await withRetry(async () => {
        return db.supplier.findFirst({
          where: { id, organizationId: orgId },
          select: { id: true },
        });
      }, 2, 500);

      if (!existing) {
        return NextResponse.json(
          { error: "Supplier not found" },
          { status: 404 },
        );
      }

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

      const supplier = await withRetry(async () => {
        return db.supplier.update({
          where: { id },
          data: updateData,
        });
      }, 2, 500);

      return NextResponse.json({
        supplier,
        access: { canRead: access.canRead, canWrite: access.canWrite },
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
      const outcome = await resolveSupplierAccess(authCtx, {
        requireWrite: true,
      });
      if (!outcome.ok) return outcome.response;
      const { access } = outcome;
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
        access: { canRead: access.canRead, canWrite: access.canWrite },
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