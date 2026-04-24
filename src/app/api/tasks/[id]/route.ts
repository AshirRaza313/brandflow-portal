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
    logger.info("[Tasks] PATCH request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the task belongs to this organization
    const existing = await db.teamTask.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const task = await db.teamTask.update({ where: { id }, data: body });
    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("Tasks PATCH error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (
  req: NextRequest,
  authCtx,
  ctx: RouteContext
) => {
  try {
    logger.info("[Tasks] DELETE request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { id } = await ctx.params;
    const orgId = authCtx.organizationId!;

    // Verify the task belongs to this organization
    const existing = await db.teamTask.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return notFoundOrUnauthorizedResponse();

    await db.teamTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Tasks DELETE error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
});
