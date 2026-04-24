import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const notifications: {
      id: string;
      type: "new_order" | "status_change" | "low_stock" | "task_due" | "payment_received";
      title: string;
      description: string;
      timestamp: string;
      read: boolean;
      referenceId?: string;
      referenceType?: string;
    }[] = [];

    // ── 1. New Orders (last 24h) ──
    const recentOrders = await db.order.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: twentyFourHoursAgo },
        status: { not: "cancelled" },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const order of recentOrders) {
      notifications.push({
        id: `new-order-${order.id}`,
        type: "new_order",
        title: "New Order Received",
        description: `Order ${order.orderNumber} from ${order.customer?.name || "Walk-in"} — Rs. ${order.total.toLocaleString()}`,
        timestamp: order.createdAt.toISOString(),
        read: false,
        referenceId: order.id,
        referenceType: "order",
      });
    }

    // ── 2. Recent Status Changes (orders updated in last 24h but created earlier) ──
    const recentStatusChanges = await db.order.findMany({
      where: {
        organizationId: orgId,
        updatedAt: { gte: twentyFourHoursAgo },
        createdAt: { lt: twentyFourHoursAgo },
        status: { not: "cancelled", not: "pending" },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    for (const order of recentStatusChanges) {
      notifications.push({
        id: `status-${order.id}`,
        type: "status_change",
        title: `Order ${order.orderNumber} — ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
        description: `${order.customer?.name || "Walk-in"}'s order is now ${order.status}`,
        timestamp: order.updatedAt.toISOString(),
        read: false,
        referenceId: order.id,
        referenceType: "order",
      });
    }

    // ── 3. Low Stock Products (stock < 10, active only) ──
    const lowStockProducts = await db.product.findMany({
      where: {
        organizationId: orgId,
        stock: { lt: 10 },
        status: "active",
      },
      orderBy: { stock: "asc" },
      take: 10,
    });

    for (const product of lowStockProducts) {
      notifications.push({
        id: `low-stock-${product.id}`,
        type: "low_stock",
        title: "Low Stock Alert",
        description: `${product.name} has only ${product.stock} unit${product.stock !== 1 ? "s" : ""} left`,
        timestamp: product.updatedAt.toISOString(),
        read: product.stock > 0,
        referenceId: product.id,
        referenceType: "product",
      });
    }

    // ── 4. Tasks Due (due within 48h, not done) ──
    const dueTasks = await db.teamTask.findMany({
      where: {
        organizationId: orgId,
        dueDate: { lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
        status: { not: "done" },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    for (const task of dueTasks) {
      const isOverdue = task.dueDate && task.dueDate < now;
      notifications.push({
        id: `task-${task.id}`,
        type: "task_due",
        title: isOverdue ? "Overdue Task" : "Task Due Soon",
        description: `${task.title}${task.dueDate ? ` — due ${task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`,
        timestamp: task.updatedAt.toISOString(),
        read: false,
        referenceId: task.id,
        referenceType: "task",
      });
    }

    // ── 5. Payment Received (delivered orders in last 24h) ──
    const deliveredOrders = await db.order.findMany({
      where: {
        organizationId: orgId,
        status: "delivered",
        updatedAt: { gte: twentyFourHoursAgo },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    for (const order of deliveredOrders) {
      notifications.push({
        id: `payment-${order.id}`,
        type: "payment_received",
        title: "Payment Received",
        description: `Order ${order.orderNumber} delivered — Rs. ${order.total.toLocaleString()} confirmed`,
        timestamp: order.updatedAt.toISOString(),
        read: false,
        referenceId: order.id,
        referenceType: "order",
      });
    }

    // Sort all notifications by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    logger.error("Fetch notifications error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
});
