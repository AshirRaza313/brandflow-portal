import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import { sanitizeObject, sanitizeEmail, sanitizePhone } from "@/lib/sanitize";
import logger from "@/lib/logger";

export const GET = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Customers] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    const customer = await db.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: { items: { select: { productName: true, quantity: true, total: true } } },
        },
      },
    });
    if (!customer) return notFoundOrUnauthorizedResponse();
    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Failed to fetch customer:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Customers] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify customer belongs to this organization
    const existing = await db.customer.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));

    // Build update data from provided fields only
    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.city !== undefined) data.city = body.city || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.loyaltyTier !== undefined) data.loyaltyTier = body.loyaltyTier;
    if (body.totalSpent !== undefined) data.totalSpent = body.totalSpent;
    if (body.orderCount !== undefined) data.orderCount = body.orderCount;

    const customer = await db.customer.update({
      where: { id },
      data,
    });
    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Failed to update customer:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Customers] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify customer belongs to this organization
    const existing = await db.customer.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete customer:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
});
