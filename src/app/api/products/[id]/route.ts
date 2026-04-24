import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// GET /api/products/[id] — Fetch a single product by ID
export const GET = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    const product = await db.product.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!product) {
      return notFoundOrUnauthorizedResponse();
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("[GET /api/products/[id]]", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
});

// PATCH /api/products/[id] — Update an existing product
export const PATCH = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify product exists and belongs to this organization
    const existing = await db.product.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      return notFoundOrUnauthorizedResponse();
    }

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const product = await db.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.price !== undefined && { price: body.price ? parseFloat(body.price) : 0 }),
        ...(body.costPrice !== undefined && {
          costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
        }),
        ...(body.stock !== undefined && { stock: body.stock !== "" ? parseInt(body.stock) : 0 }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("[PATCH /api/products/[id]]", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
});

// DELETE /api/products/[id] — Delete a product and its related order items
export const DELETE = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Products] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify product exists and belongs to this organization
    const existing = await db.product.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      return notFoundOrUnauthorizedResponse();
    }

    // Delete related order items first, then the product
    await db.orderItem.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/products/[id]]", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
});
