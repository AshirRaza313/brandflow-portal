import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth, AuthContext } from "@/lib/auth-middleware";
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

    if (!authCtx.organizationId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    // Canonical audience policy applies to ALL roles, including platform.
    const audienceWhere = getNotificationAudienceWhere({
      userId: authCtx.userId,
      organizationId: authCtx.organizationId,
      role: authCtx.role,
    });

    const notification = await withRetry(async () => {
      return await db.notification.findFirst({
        where: {
          id,
          ...audienceWhere,
        },
      });
    }, 2, 500);

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // user-specific ownership enforcement for non-org-wide rows
    if (notification.userId && notification.userId !== authCtx.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Read semantics ──
    if (notification.userId === null) {
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
