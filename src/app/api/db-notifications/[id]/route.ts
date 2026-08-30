import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth, isPlatformRole, AuthContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

// PUT /api/db-notifications/[id] - Mark notification as read
export const PUT = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx: AuthContext
) => {
  try {
    logger.info("[DB Notifications] PUT request", { userId: authCtx.userId });
    // Extract ID from URL path
    const urlParts = req.url.split("/");
    const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

    const notification = await withRetry(async () => {
      return await db.notification.findUnique({ where: { id } })
    }, 2, 500);
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // ── Org ownership check: ensure the notification belongs to the caller's org ──
    // Platform admins can access any notification; all others must match orgId.
    if (!isPlatformRole(authCtx.role)) {
      if (notification.orgId && notification.orgId !== authCtx.organizationId) {
        logger.warn("[DB Notifications] Cross-org access denied", {
          userId: authCtx.userId,
          notificationOrgId: notification.orgId,
          callerOrgId: authCtx.organizationId,
        });
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      // Also ensure user-specific notifications can only be marked by the target user
      if (notification.userId && notification.userId !== authCtx.userId) {
        logger.warn("[DB Notifications] Cross-user access denied", {
          userId: authCtx.userId,
          notificationUserId: notification.userId,
        });
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await withRetry(async () => {
      return await db.notification.update({
      where: { id },
      data: { read: true },
    })
    }, 2, 500);

    return NextResponse.json({ success: true, message: "Notification marked as read" });
  } catch (error: unknown) {
    logger.error("Mark notification read error:", error);
    if (isDbUnavailable(error)) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
