import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

export const PATCH = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Coupons] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the coupon belongs to this organization
    const existing = await db.coupon.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const coupon = await db.coupon.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error("Coupons PATCH error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Coupons] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the coupon belongs to this organization
    const existing = await db.coupon.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Coupons DELETE error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
});
