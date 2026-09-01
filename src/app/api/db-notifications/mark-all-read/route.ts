import { NextRequest, NextResponse } from "next/server";
import { db, isDbUnavailable, dbErrorResponse, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

// POST /api/db-notifications/mark-all-read?orgId=xxx
// Marks ALL unread notifications for the org as read in a single DB operation.
// Replaces sequential per-notification PUTs — single query, no rate-limit burst.
export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId || authCtx.organizationId !== orgId) {
      return NextResponse.json({ error: "Invalid orgId" }, { status: 400 });
    }

    const result = await withRetry(async () => {
      return await db.notification.updateMany({
        where: { orgId, read: false },
        data: { read: true },
      });
    }, 2, 500);

    logger.info("[Notifications] Mark-all-read", { userId: authCtx.userId, orgId, updatedCount: result.count });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error: unknown) {
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    logger.error("[Notifications] mark-all-read failed", { error });
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}));
