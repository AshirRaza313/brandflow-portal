import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { missingOrgIdResponse, notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const DELETE = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Orders] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the order belongs to this organization
    const order = await db.order.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { select: { productId: true, quantity: true } },
        customer: { select: { id: true } },
      },
    });

    if (!order) {
      return notFoundOrUnauthorizedResponse();
    }

    // Restore product stock
    for (const item of order.items) {
      try {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      } catch {
        // Product might have been deleted, skip
      }
    }

    // Restore customer stats
    if (order.customerId && order.customer) {
      try {
        await db.customer.update({
          where: { id: order.customerId },
          data: {
            totalSpent: { decrement: order.total },
            orderCount: { decrement: 1 },
          },
        });
      } catch {
        // Customer might have been deleted, skip
      }
    }

    // Delete order items then order
    await db.orderItem.deleteMany({ where: { orderId: id } });
    await db.order.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete order error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Orders] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the order belongs to this organization
    const existing = await db.order.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return notFoundOrUnauthorizedResponse();
    }

    const body = await req.json();

    // Only allow certain fields to be updated
    const allowedFields = ["status", "notes", "courier", "trackingNumber", "priority", "channel"];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const order = await db.order.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { name: true } }, items: true },
    });
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Update order error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
});
