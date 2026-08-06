// src/app/api/operations/suppliers/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Suppliers API — List (GET) + Create (POST)
// PR #6: Suppliers persistence with performance ratings
// ─────────────────────────────────────────────────────────────────────────────
//
// Team-member review requirements enforced:
//   1. Organization ID sourced from authenticated session (authCtx), never
//      from client input. Query/body schemas intentionally exclude orgId.
//   2. Ratings support 1-5 + null (for clearing) — validated by Zod.
//   3. Viewer/member accounts are read-only — canWriteSuppliers() gate on POST.
//   4. Org isolation — every query filters by authCtx.organizationId.
//   5. Loading/empty/error states handled — 503 on DB down, structured JSON.
//
// Pattern: mirrors src/app/api/products/route.ts (withAuth + withRateLimit +
// validateBody/validateQuery + withRetry + logger + dbErrorResponse).

import { NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody, validateQuery } from "@/lib/validations";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canReadSuppliers,
  canWriteSuppliers,
  createSupplierSchema,
  suppliersQuerySchema,
} from "@/lib/supplier-store";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────
// List suppliers for the authenticated user's organization.
//
// Query params (all optional):
//   page        — page number (default 1)
//   limit       — page size (default 20, capped by paginationQuerySchema)
//   search      — search across name, email, contactPerson, category
//   category    — filter by exact category
//   status      — filter by status (active | inactive | blacklisted)
//   minRating   — filter suppliers with rating >= N (1-5)
//   maxRating   — filter suppliers with rating <= N (1-5)
//
// Returns:
//   200 — { suppliers, stats, pagination }
//   403 — user lacks read permission
//   503 — database unavailable
//   500 — unexpected error

export const GET = withRateLimit(
  withAuth(async (req, authCtx) => {
    try {
      // Permission gate — all authenticated org members can read,
      // but we still check explicitly for clarity + future role changes.
      if (!canReadSuppliers(authCtx.role)) {
        return NextResponse.json(
          { error: "You do not have permission to view suppliers" },
          { status: 403 }
        );
      }

      // Org ID comes ONLY from the session — never from query params.
      const orgId = authCtx.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }

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

      // Rating range filter — null ratings are "unrated" and excluded from
      // min/max filters. We build a single IntNullableFilter object that
      // Prisma accepts: { not: null, gte?: min, lte?: max }
      if (minRating !== undefined || maxRating !== undefined) {
        const ratingFilter: { not: null; gte?: number; lte?: number } = {
          not: null,
        };
        if (minRating !== undefined) ratingFilter.gte = minRating;
        if (maxRating !== undefined) ratingFilter.lte = maxRating;
        where.rating = ratingFilter;
      }

      // Search across multiple fields
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
        ];
      }

      // Pagination
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

        // Summary stats for the org (independent of filters — reflects total state)
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
            averageRating: averageRating !== null
              ? Math.round(averageRating * 100) / 100 // 2 decimal places
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
        { status: 500 }
      );
    }
  }),
  { maxRequests: 60, windowSeconds: 60 }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/operations/suppliers
// ─────────────────────────────────────────────────────────────────────────────
// Create a new supplier for the authenticated user's organization.
//
// Body (createSupplierSchema):
//   name (required), contactPerson, email, phone, category, status,
//   address, notes, rating (1-5 or null)
//
// Returns:
//   201 — { supplier }
//   400 — validation error
//   403 — viewer/member attempting write, or missing org context
//   503 — database unavailable
//   500 — unexpected error

export const POST = withRateLimit(
  withAuth(async (req, authCtx) => {
    try {
      const orgId = authCtx.organizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 }
        );
      }

      // Permission gate — viewer/member accounts are read-only.
      // Team-member review: "Viewer accounts must remain read-only."
      if (!canWriteSuppliers(authCtx.role)) {
        return NextResponse.json(
          { error: "Read-only users cannot create suppliers" },
          { status: 403 }
        );
      }

      // Validate body — orgId is intentionally absent from schema
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
            organizationId: orgId, // ← from session, NOT from body
            name,
            contactPerson: contactPerson || null,
            email: email || null,
            phone: phone || null,
            category: category || "General",
            status: status || "active",
            address: address || null,
            notes: notes || null,
            rating: rating ?? null, // null = unrated at creation
          },
        });
      }, 2, 500);

      return NextResponse.json({ supplier }, { status: 201 });
    } catch (error: unknown) {
      logger.error("Create supplier API error", error, {
        orgId: authCtx?.organizationId,
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
        { error: "Failed to create supplier" },
        { status: 500 }
      );
    }
  }),
  { maxRequests: 30, windowSeconds: 60 }
);