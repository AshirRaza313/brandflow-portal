// src/app/api/operations/suppliers/stats/route.ts
//
// Server-side aggregate stats for the Suppliers page.
// Returns counts + average rating + top performer + needs-attention count
// in a single round-trip, so the client does not compute these over a
// partial loaded page.
//
// Authorization: uses resolveSupplierAccess(db, authCtx) — same pattern as
// the list/create/update/delete routes. Re-resolves OrganizationMember +
// active ValtrioxTeamMember on every request. Stale sessions are rejected.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limit";
import { resolveSupplierAccess, type SupplierStatsResponse } from "@/lib/supplier-access";
import logger from "@/lib/logger";

export const GET = withRateLimit(
  withAuth(async (req, authCtx) => {
    try {
      // Re-resolve authorization from the DB on every request.
      const access = await resolveSupplierAccess(db, authCtx);
      if (!access || !access.canReadSuppliers) {
        return NextResponse.json(
          { error: "You do not have permission to view supplier stats" },
          { status: 403 },
        );
      }
      const orgId = access.organizationId;

      // Four parallel indexed queries — all hit existing indexes.
      const [total, ratedAgg, topPerformer, needsAttention] = await Promise.all([
        db.supplier.count({ where: { organizationId: orgId } }),
        db.supplier.aggregate({
          where: { organizationId: orgId, rating: { not: null } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        db.supplier.findFirst({
          where: { organizationId: orgId, rating: { not: null } },
          orderBy: { rating: "desc", updatedAt: "desc" },
          select: { id: true, name: true, rating: true },
        }),
        db.supplier.count({
          where: { organizationId: orgId, rating: { not: null, lt: 3 } },
        }),
      ]);

            const response: SupplierStatsResponse = {
        totalSuppliers: total,
        ratedCount: ratedAgg._count._all,
        // Return null (not 0) when no rated suppliers exist.
        // UI uses null to render "Not Rated" badge correctly.
        avgRating: ratedAgg._avg.rating ?? null,
        topPerformer,
        needsAttentionCount: needsAttention,
        access: {
          canRead: access.canReadSuppliers,
          canWrite: access.canWriteSuppliers,
        },
      };
      return NextResponse.json(response);
    } catch (error: unknown) {
      logger.error("Supplier stats API error", error, {
        orgId: authCtx?.organizationId,
      });
      return NextResponse.json(
        { error: "Failed to fetch supplier stats" },
        { status: 500 },
      );
    }
  }),
  { maxRequests: 60, windowSeconds: 60 },
);