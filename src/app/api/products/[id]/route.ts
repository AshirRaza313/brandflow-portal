import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import { validateBody } from "@/lib/validations/api";
import { updateProductSchema } from "@/lib/validations/schemas";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canWriteProductCatalog,
  resolveAssignableProductCategory,
} from "@/lib/product-category-store";

// GET /api/products/[id] - Fetch a single product by ID
export const GET = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    const product = await withRetry(async () => {
      return db.product.findFirst({
        where: { id, organizationId: orgId },
      });
    }, 2, 500);

    if (!product) {
      return notFoundOrUnauthorizedResponse();
    }

    return NextResponse.json({ product });
  } catch (error: unknown) {
    logger.error("[GET /api/products/[id]]", error);
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}), { maxRequests: 60, windowSeconds: 60 });

// PATCH /api/products/[id] - Update an existing product
export const PATCH = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }
    if (!canWriteProductCatalog(authCtx.role)) {
      return NextResponse.json({ error: "Read-only users cannot update products" }, { status: 403 });
    }

    // Verify product exists and belongs to this organization
    const existing = await withRetry(async () => {
      return db.product.findFirst({ where: { id, organizationId: orgId } });
    }, 2, 500);
    if (!existing) {
      return notFoundOrUnauthorizedResponse();
    }

    const result = await validateBody(req, updateProductSchema);
    if (!result.success) return result.response;
    const body = result.data;

    const resolvedCategory = body.category !== undefined
      ? await resolveAssignableProductCategory(db, orgId, body.category)
      : null;
    if (resolvedCategory && !resolvedCategory.ok) {
      return NextResponse.json({ error: resolvedCategory.error }, { status: 409 });
    }

    const product = await withRetry(async () => {
      return db.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.price !== undefined && { price: body.price ?? 0 }),
        ...(body.costPrice !== undefined && {
          costPrice: body.costPrice ?? null,
        }),
        ...(body.stock !== undefined && { stock: body.stock ?? 0 }),
        ...(body.category !== undefined && { category: resolvedCategory?.name ?? null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      },
    });
    }, 2, 500);

    return NextResponse.json({ product });
  } catch (error: unknown) {
    logger.error("[PATCH /api/products/[id]]", error);
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });

// DELETE /api/products/[id] - Delete a product and its related order items
export const DELETE = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }
    if (!canWriteProductCatalog(authCtx.role)) {
      return NextResponse.json({ error: "Read-only users cannot delete products" }, { status: 403 });
    }

    // Verify product exists and belongs to this organization
    const existing = await withRetry(async () => {
      return db.product.findFirst({ where: { id, organizationId: orgId } });
    }, 2, 500);
    if (!existing) {
      return notFoundOrUnauthorizedResponse();
    }

    // Delete related order items first, then the product
    await withRetry(async () => {
      await db.orderItem.deleteMany({ where: { productId: id } });
      await db.product.delete({ where: { id } });
    }, 2, 500);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("[DELETE /api/products/[id]]", error);
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
