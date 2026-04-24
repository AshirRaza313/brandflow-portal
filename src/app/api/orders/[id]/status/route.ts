import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { notFoundOrUnauthorizedResponse } from "@/lib/api-utils";
import { withAuth, RouteContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const PATCH = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Orders] Status PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
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

    const { status } = await req.json();
    if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: { customer: { select: { name: true } }, items: true },
    });
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Order status update error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
});
