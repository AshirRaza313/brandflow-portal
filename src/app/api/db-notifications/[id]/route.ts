import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth, isPlatformRole, AuthContext } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { getNotificationAudienceWhere } from "@/lib/notification-audience";

// PUT /api/db-notifications/[id] - Mark notification as read for current user
export const PUT = withRateLimit(withAuth(async (
  req: NextRequest,
  authCtx: AuthContext
) => {
  try {
    logger.info("[DB Notifications] PUT request", { userId: authCtx.userId });
    const urlParts = req.url.split("/");
    const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

    // Build canonical audience where for non-platform roles
    const audienceWhere = getNotificationAudienceWhere({
      userId: authCtx.userId,
      organizationId: authCtx.organizationId || "",
      role: authCtx.role,
    });

    // Fetch notification with audience constraints
    const notification = await withRetry(async () => {
      return await db.notification.findFirst({
        where: {
          id,
          ...(isPlatformRole(authCtx.role) ? {} : audienceWhere),
        },
      });
    }, 2, 500);

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // For non-platform, ensure user-specific ownership if userId is set
    if (!isPlatformRole(authCtx.role) && notification.userId && notification.userId !== authCtx.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Hidden types for unlimited roles are already excluded by audienceWhere for non-platform.
    // For platform roles, allow all types.

    // ── Read semantics ──
    if (notification.userId === null) {
      // Org-wide: create per-user read receipt
      await withRetry(async () => {
        return await db.notificationReadReceipt.upsert({
          where: {
            notificationId_userId: {
              notificationId: notification.id,
              userId: authCtx.userId,
            },
          },
          create: {
            notificationId: notification.id,
            userId: authCtx.userId,
          },
          update: {},
        });
      }, 2, 500);
    } else {
      // Targeted: update read flag
      await withRetry(async () => {
        return await db.notification.update({
          where: { id },
          data: { read: true },
        });
      }, 2, 500);
    }

    return NextResponse.json({ success: true, message: "Notification marked as read" });
  } catch (error: unknown) {
    logger.error("Mark notification read error:", error);
    if (isDbUnavailable(error)) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
