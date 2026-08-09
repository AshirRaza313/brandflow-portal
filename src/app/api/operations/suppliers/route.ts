// src/app/api/operations/suppliers/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Suppliers API — List (GET) + Create (POST)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Issue #2 (Authorization hardening — Seasonal Events pattern):
//   - Every request re-resolves OrganizationMember + active ValtrioxTeamMember
//     from the DB via resolveSupplierAccess(db, authCtx).
//   - Uses canonical `operations` permission key (not custom supplier keys).
//   - Trusts roleDef only when roleDef.name === member.role (stale roleId safe).
//   - Rejects stale valtriox_team memberships via status="active" filter.
//   - Respects hidden "suppliers" section for Valtriox team members.
//   - Viewer role is always read-only.
//   - GET responses include `access: { canReadSuppliers, canWriteSuppliers }`
//     so the UI can render add/edit/delete buttons without trusting the session.

import { NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody, validateQuery } from "@/lib/validations";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  createSupplierSchema,
  suppliersQuerySchema,
} from "@/lib/supplier-store";
import { resolveSupplierAccess } from "@/lib/supplier-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withRateLimit(
  withAuth(async (req, authCtx) => {
    try {
      // Re-resolve authorization from the DB on every request.
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canReadSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to view suppliers" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      // Validate query params
      const queryResult = validateQuery(req, suppliersQuerySchema);
      if (!queryResult.success) return queryResult.response;
      const { page, limit, search, category, status, minRating, maxRating } =
        queryResult.data;

      // Build org-scoped WHERE clause
      const where: Record<string, unknown> = { organizationId: orgId };

      if (category && category !== "all") {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (minRating !== undefined || maxRating !== undefined) {
        const ratingFilter: { not: null; gte?: number; lte?: number } = {
          not: null,
        };
        if (minRating !== undefined) ratingFilter.gte = minRating;
        if (maxRating !== undefined) ratingFilter.lte = maxRating;
        where.rating = ratingFilter;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (page - 1) * limit;

      const { suppliers, stats, totalCount } = await withRetry(async () => {
        const [list, count] = await Promise.all([
          db.supplier.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          db.supplier.count({ where }),
        ]);

        const [total, active, inactive, blacklisted, ratedCount, ratingSum] =
          await Promise.all([
            db.supplier.count({ where: { organizationId: orgId } }),
            db.supplier.count({
              where: { organizationId: orgId, status: "active" },
            }),
            db.supplier.count({
              where: { organizationId: orgId, status: "inactive" },
            }),
            db.supplier.count({
              where: { organizationId: orgId, status: "blacklisted" },
            }),
            db.supplier.count({
              where: {
                organizationId: orgId,
                rating: { not: null },
              },
            }),
            db.supplier.aggregate({
              where: {
                organizationId: orgId,
                rating: { not: null },
              },
              _sum: { rating: true },
            }),
          ]);

        const averageRating =
          ratedCount > 0 ? (ratingSum._sum.rating ?? 0) / ratedCount : null;

        return {
          suppliers: list,
          stats: {
            total,
            active,
            inactive,
            blacklisted,
            ratedCount,
            averageRating:
              averageRating !== null
                ? Math.round(averageRating * 100) / 100
                : null,
          },
          totalCount: count,
        };
      }, 2, 500);

      return NextResponse.json({
        suppliers,
        stats,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        access: {
          canRead: access.canReadSuppliers,
          canWrite: access.canWriteSuppliers,
        },
      });
    } catch (error: unknown) {
      logger.error("Suppliers API error", error, {
        orgId: authCtx?.organizationId,
      });
      if (isDbUnavailable(error)) {
        return dbErrorResponse(error);
      }
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 60, windowSeconds: 60 },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withRateLimit(
  withAuth(async (req, authCtx) => {
    try {
      // Re-resolve authorization — requires write access.
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canWriteSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to create suppliers" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      const bodyResult = await validateBody(req, createSupplierSchema);
      if (!bodyResult.success) return bodyResult.response;
      const {
        name,
        contactPerson,
        email,
        phone,
        category,
        status,
        address,
        notes,
        rating,
      } = bodyResult.data;

      const supplier = await withRetry(async () => {
        return db.supplier.create({
          data: {
            organizationId: orgId,
            name,
            contactPerson: contactPerson || null,
            email: email || null,
            phone: phone || null,
            category: category || "General",
            status: status || "active",
            address: address || null,
            notes: notes || null,
            rating: rating ?? null,
          },
        });
      }, 2, 500);

      return NextResponse.json(
        {
          supplier,
          access: {
            canRead: access.canReadSuppliers,
            canWrite: access.canWriteSuppliers,
          },
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      logger.error("Create supplier API error", error, {
        orgId: authCtx?.organizationId,
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
        { error: "Failed to create supplier" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 },
);