import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { getNotificationAudienceWhere } from "@/lib/notification-audience";
import { isUnlimitedRole } from "@/lib/plan-limits";

// GET /api/db-notifications - Return notifications for the current user/organization
export const GET = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[DB Notifications] GET request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);

    const orgId = authCtx.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    const audienceWhere = getNotificationAudienceWhere({
      userId: authCtx.userId,
      organizationId: orgId,
      role: authCtx.role,
    });

    // Hidden types for unlimited roles (same as helper, but also used for counts)
    const hiddenTypes = isUnlimitedRole(authCtx.role)
      ? ["storage_warning", "storage_critical", "subscription_renewal", "subscription_expired", "trial_expired", "trial_expiring"]
      : [];

    // Build base where for counts and listing
    const baseWhere: any = {
      ...audienceWhere,
    };

    // Count unread using same per-user logic as read status
    const targetUnreadCount = await withRetry(async () => {
      return await db.notification.count({
        where: {
          orgId,
          userId: authCtx.userId,
          read: false,
          ...(hiddenTypes.length > 0 ? { NOT: { type: { in: hiddenTypes } } } : {}),
        },
      });
    }, 2, 500);

    const orgWideUnreadCount = await withRetry(async () => {
      return await db.notification.count({
        where: {
          orgId,
          userId: null,
          // Legacy row compatibility: rows with read=true are considered read
          read: false,
          readReceipts: { none: { userId: authCtx.userId } },
          ...(hiddenTypes.length > 0 ? { NOT: { type: { in: hiddenTypes } } } : {}),
        },
      });
    }, 2, 500);

    const unreadCount = targetUnreadCount + orgWideUnreadCount;

    // Fetch notifications with unread filter applied at DB level where possible
    let notifications;
    if (unreadOnly) {
      const whereUnread: any = {
        orgId,
        OR: [
          { userId: authCtx.userId, read: false },
          { userId: null, read: false, readReceipts: { none: { userId: authCtx.userId } } },
        ],
        ...(hiddenTypes.length > 0 ? { NOT: { type: { in: hiddenTypes } } } : {}),
      };
      notifications = await withRetry(async () => {
        return await db.notification.findMany({
          where: whereUnread,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit,
          skip: offset,
        });
      }, 2, 500);
      notifications = notifications.map((n: any) => ({ ...n, read: false }));
    } else {
      notifications = await withRetry(async () => {
        return await db.notification.findMany({
          where: baseWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit,
          skip: offset,
        });
      }, 2, 500);

      // For org-wide rows in full listing, compute read from receipts
      const orgWideIds = notifications.filter(n => n.userId === null).map(n => n.id);
      let readReceiptIds: string[] = [];
      if (orgWideIds.length > 0) {
        const receipts = await withRetry(async () => {
          return await db.notificationReadReceipt.findMany({
            where: {
              userId: authCtx.userId,
              notificationId: { in: orgWideIds },
            },
            select: { notificationId: true },
          });
        }, 2, 500);
        readReceiptIds = receipts.map(r => r.notificationId);
      }

      notifications = notifications.map(n => ({
        ...n,
        read: n.userId === authCtx.userId ? n.read : (n.read || readReceiptIds.includes(n.id)),
      }));
    }

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: unknown) {
    logger.error("Fetch notifications error:", error);
    if (isDbUnavailable(error)) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}), { maxRequests: 60, windowSeconds: 60 });



