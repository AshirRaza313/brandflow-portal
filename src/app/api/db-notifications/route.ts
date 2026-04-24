import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/db-notifications — Return notifications for the current user/organization
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[DB Notifications] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unread") === "true";

    // Security: ensure orgId matches auth context
    if (orgId && orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    // Security: ensure userId matches auth context
    if (userId && userId !== authCtx.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (userId) where.userId = userId;
    if (unreadOnly) where.read = false;

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const unreadCount = await db.notification.count({
      where: {
        ...(orgId ? { orgId } : {}),
        ...(userId ? { userId } : {}),
        read: false,
      },
    });

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
  } catch (error: any) {
    console.error("Fetch notifications error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
});
