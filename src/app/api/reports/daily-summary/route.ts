import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Daily Summary API
// Returns today's summary: orders, revenue, new customers, top products, low stock
// Includes comparison with yesterday's data
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Reports Daily Summary] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId!;

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Date Ranges ──
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // ── Today's Stats ──
    const [todayOrders, todayRevenue, newCustomers, topProducts, lowStockProducts] = await Promise.all([
      // Orders today
      db.order.count({
        where: { organizationId: orgId, createdAt: { gte: todayStart } },
      }),
      // Revenue today
      db.order.aggregate({
        where: { organizationId: orgId, createdAt: { gte: todayStart } },
        _sum: { total: true },
      }),
      // New customers today
      db.customer.count({
        where: { organizationId: orgId, createdAt: { gte: todayStart } },
      }),
      // Top selling products today (by quantity sold)
      db.orderItem.groupBy({
        by: ["productId", "productName"],
        where: {
          order: { organizationId: orgId, createdAt: { gte: todayStart } },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      // Low stock alerts
      db.product.findMany({
        where: {
          organizationId: orgId,
          stock: { lte: 10 },
          status: "active",
        },
        orderBy: { stock: "asc" },
        take: 5,
        select: { id: true, name: true, stock: true, price: true },
      }),
    ]);

    // ── Yesterday's Stats (for comparison) ──
    const [yesterdayOrders, yesterdayRevenue, yesterdayNewCustomers] = await Promise.all([
      db.order.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      db.order.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
        _sum: { total: true },
      }),
      db.customer.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
    ]);

    // ── Pending & Active Orders ──
    const [pendingOrders, activeOrders] = await Promise.all([
      db.order.count({
        where: { organizationId: orgId, status: "pending" },
      }),
      db.order.count({
        where: {
          organizationId: orgId,
          status: { in: ["pending", "confirmed", "packed", "dispatched"] },
        },
      }),
    ]);

    // Calculate percentage changes
    const orderChange = yesterdayOrders > 0
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : todayOrders > 0 ? 100 : 0;

    const todayRev = todayRevenue._sum.total || 0;
    const yesterdayRev = yesterdayRevenue._sum.total || 0;
    const revenueChange = yesterdayRev > 0
      ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100)
      : todayRev > 0 ? 100 : 0;

    const customerChange = yesterdayNewCustomers > 0
      ? Math.round(((newCustomers - yesterdayNewCustomers) / yesterdayNewCustomers) * 100)
      : newCustomers > 0 ? 100 : 0;

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return NextResponse.json({
      date: todayStart.toISOString().split("T")[0],
      today: {
        orders: todayOrders,
        revenue: todayRev,
        revenueFormatted: formatCurrency(todayRev),
        newCustomers,
        pendingOrders,
        activeOrders,
      },
      yesterday: {
        orders: yesterdayOrders,
        revenue: yesterdayRev,
        revenueFormatted: formatCurrency(yesterdayRev),
        newCustomers: yesterdayNewCustomers,
      },
      changes: {
        orders: orderChange,
        revenue: revenueChange,
        newCustomers: customerChange,
      },
      topProducts: topProducts.map((p) => ({
        name: p.productName,
        quantitySold: p._sum.quantity || 0,
        revenue: p._sum.total || 0,
      })),
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: p.price,
      })),
    });
  } catch (error: any) {
    console.error("Daily summary error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch daily summary" }, { status: 500 });
  }
});
