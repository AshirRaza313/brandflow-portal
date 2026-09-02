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

    if (!authCtx.organizationId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    const orgId = authCtx.organizationId;     const baseWhere = getNotificationAudienceWhere({ userId: authCtx.userId, organizationId: orgId, role: authCtx.role });

    // Fetch all audience notifications without read filter (we'll compute read status)
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notifications = await withRetry(async () => {
      return await db.notification.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });
    }, 2, 500);

    // Fetch read receipts for org-wide notifications (userId = null) for this user
    const orgWideIds = notifications.filter(n => n.userId === null).map(n => n.id);
    let readReceiptNotificationIds: string[] = [];
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
      readReceiptNotificationIds = receipts.map(r => r.notificationId);
    }

    // Map notifications with computed read status
    const mapped = notifications.map(n => ({
      id: n.id,
      orgId: n.orgId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl,
      icon: n.icon,
      read: n.userId === authCtx.userId ? n.read : readReceiptNotificationIds.includes(n.id),
      createdAt: n.createdAt,
    }));

    const filtered = unreadOnly ? mapped.filter(n => !n.read) : mapped;

    // Accurate total unread count across entire audience (not just current page)
    const hiddenTypes = isUnlimitedRole(authCtx.role)
      ? ["storage_warning", "storage_critical", "subscription_renewal", "subscription_expired", "trial_expired", "trial_expiring"]
      : [];

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
          readReceipts: { none: { userId: authCtx.userId } },
          ...(hiddenTypes.length > 0 ? { NOT: { type: { in: hiddenTypes } } } : {}),
        },
      });
    }, 2, 500);

    const unreadCount = targetUnreadCount + orgWideUnreadCount;

    return NextResponse.json({
      notifications: filtered,
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
