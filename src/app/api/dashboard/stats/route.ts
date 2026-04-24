import { NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      totalRevenue,
      prevRevenue,
      orderCount,
      prevOrderCount,
      activeOrders,
      customerCount,
      prevCustomerCount,
      newCustomers,
      lowStockProducts,
      recentOrders,
      dailyRevenue,
      orderStatusGroups,
    ] = await Promise.all([
      // Total revenue this month (non-cancelled)
      db.order.aggregate({
        where: { organizationId: orgId, status: { not: "cancelled" }, createdAt: { gte: thirtyDaysAgo } },
        _sum: { total: true },
      }),
      // Previous month revenue
      db.order.aggregate({
        where: {
          organizationId: orgId,
          status: { not: "cancelled" },
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { total: true },
      }),
      // Total orders this month
      db.order.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
      // Previous month orders
      db.order.count({ where: { organizationId: orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      // Active (non-cancelled, non-delivered) orders
      db.order.count({ where: { organizationId: orgId, status: { notIn: ["cancelled", "delivered"] } } }),
      // Total customers
      db.customer.count({ where: { organizationId: orgId } }),
      // Previous month customers
      db.customer.count({ where: { organizationId: orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      // New customers this month
      db.customer.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
      // Low stock products
      db.product.count({ where: { organizationId: orgId, stock: { lt: 10 }, status: "active" } }),
      // Recent orders (last 5)
      db.order.findMany({
        where: { organizationId: orgId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      }),
      // Daily revenue last 7 days
      db.order.findMany({
        where: {
          organizationId: orgId,
          status: { not: "cancelled" },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { total: true, createdAt: true },
      }),
      // Order status distribution
      db.order.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
    ]);

    // Calculate daily revenue for chart
    const revenueByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      revenueByDay[key] = 0;
    }
    for (const order of dailyRevenue) {
      const key = order.createdAt.toISOString().split("T")[0];
      if (revenueByDay[key] !== undefined) {
        revenueByDay[key] += order.total;
      }
    }
    const revenueChartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Math.round(revenue * 100) / 100,
    }));

    const currentRev = totalRevenue._sum.total || 0;
    const prevRev = prevRevenue._sum.total || 0;
    const revenueChange = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

    const orderChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : 0;
    const customerChange = prevCustomerCount > 0 ? ((newCustomers - prevCustomerCount) / prevCustomerCount) * 100 : 0;

    // Conversion rate: % of customers who have at least one order
    const conversionRate = customerCount > 0
      ? Math.round((Math.min(orderCount, customerCount) / customerCount) * 1000) / 10
      : 0;

    // Average order value
    const nonCancelledOrders = orderCount > 0 ? orderCount : 0;
    const avgOrderValue = nonCancelledOrders > 0 ? Math.round((currentRev / nonCancelledOrders) * 100) / 100 : 0;

    // Order status data for pie chart
    const statusColorMap: Record<string, string> = {
      pending: "#f59e0b",
      confirmed: "#3b82f6",
      packing: "#8b5cf6",
      dispatched: "#06b6d4",
      delivered: "#059669",
      cancelled: "#ef4444",
      returned: "#f97316",
    };
    const orderStatusData = orderStatusGroups.map((g) => ({
      name: g.status.charAt(0).toUpperCase() + g.status.slice(1),
      value: g._count.status,
      fill: statusColorMap[g.status.toLowerCase()] || "#94a3b8",
    }));

    return NextResponse.json({
      totalRevenue: currentRev,
      revenueChange: Math.round(revenueChange * 10) / 10,
      orderCount,
      orderChange: Math.round(orderChange * 10) / 10,
      activeOrders,
      customerCount,
      customerChange: Math.round(customerChange * 10) / 10,
      newCustomers,
      conversionRate,
      avgOrderValue,
      lowStockProducts,
      recentOrders,
      revenueChartData,
      orderStatusData,
    });
  } catch (error: any) {
    logger.error("Dashboard stats error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
});
