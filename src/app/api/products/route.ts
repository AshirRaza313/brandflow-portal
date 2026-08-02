import { NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { validateBody, validateQuery, createProductSchema, paginationQuerySchema } from "@/lib/validations";
import logger from "@/lib/logger";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canWriteProductCatalog,
  resolveAssignableProductCategory,
} from "@/lib/product-category-store";

// Phase 3: Query validation schema for GET /products
const productsQuerySchema = paginationQuerySchema.extend({
  orgId: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
});

export const GET = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const queryResult = validateQuery(req, productsQuerySchema);
    if (!queryResult.success) return queryResult.response;
    const { page, limit, search, orgId: queryOrgId, category } = queryResult.data;

    const orgId = queryOrgId || authCtx.organizationId;
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = { organizationId: orgId };
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    // Phase 4: Apply pagination to prevent unbounded queries
    const skip = (page - 1) * limit;

    const { products, stats, totalCount } = await withRetry(async () => {
      const [prods, count] = await Promise.all([
        db.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        db.product.count({ where }),
      ]);

      const [total, active, lowStock] = await Promise.all([
        db.product.count({ where: { organizationId: orgId } }),
        db.product.count({ where: { organizationId: orgId, status: "active" } }),
        db.product.count({ where: { organizationId: orgId, stock: { lt: 10 }, status: "active" } }),
      ]);

      const totalValue = await db.product.aggregate({
        where: { organizationId: orgId },
        _sum: { price: true },
      });

      return { products: prods, stats: { total, active, lowStock, totalValue: totalValue._sum.price || 0 }, totalCount: count };
    }, 2, 500);

    return NextResponse.json({
      products,
      stats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    logger.error("Products API error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}), { maxRequests: 60, windowSeconds: 60 });

export const POST = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }
    if (!canWriteProductCatalog(authCtx.role)) {
      return NextResponse.json({ error: "Read-only users cannot create products" }, { status: 403 });
    }

    // Phase 3: Zod validation replaces raw req.json() + manual checks
    const bodyResult = await validateBody(req, createProductSchema);
    if (!bodyResult.success) return bodyResult.response;
    const { name, sku, description, price, costPrice, stock, category, status } = bodyResult.data;

    const resolvedCategory = await resolveAssignableProductCategory(db, orgId, category);
    if (!resolvedCategory.ok) {
      return NextResponse.json({ error: resolvedCategory.error }, { status: 409 });
    }

    const product = await withRetry(async () => {
      return db.product.create({
        data: {
          organizationId: orgId,
          name,
          sku: sku || null,
          description: description || null,
          price: price,
          costPrice: costPrice ?? null,
          stock: stock,
          category: resolvedCategory.name,
          status: status || "active",
        },
      });
    }, 2, 500);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: unknown) {
    logger.error("Create product API error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) {
      return NextResponse.json({ error: "Database is currently unavailable. Please try again later.", fallback: true }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
