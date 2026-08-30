import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

// GET /api/db-notifications - Return notifications for the current user/organization
export const GET = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[DB Notifications] GET request", { userId: authCtx.userId });
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const orgId = authCtx.organizationId;
    const userId = authCtx.userId;

    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    // Audience filter: org-wide (userId=null) + user-specific
    const where: any = {
      orgId,
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
    };
    if (unreadOnly) where.read = false;

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notifications = await withRetry(async () => {
      return await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })
    }, 2, 500);

    const unreadCount = await withRetry(async () => {
      return await db.notification.count({
      where: {
        orgId,
        OR: [
          { userId: null },
          ...(userId ? [{ userId }] : []),
        ],
        read: false,
      },
    })
    }, 2, 500);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        orgId: n.orgId,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        actionUrl: n.actionUrl,
        icon: n.icon,
        read: n.read,
        createdAt: n.createdAt,
      })),
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
