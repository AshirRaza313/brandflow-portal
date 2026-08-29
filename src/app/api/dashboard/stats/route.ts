import { NextResponse } from "next/server";
import { db, safeDbQuery, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Security: Ensure user can only access their own org's data
    // Allow if orgId matches authCtx, OR if user is a verified member of the requested org
    if (orgId !== authCtx.organizationId) {
      // Double-check: is the user actually a member of this org?
      const memberCheck = await safeDbQuery(() =>
        db.organizationMember.findFirst({
          where: { userId: authCtx.userId, organizationId: orgId },
        })
      );
      if (memberCheck.error) return memberCheck.errorResponse;

      const vtCheck = await safeDbQuery(() =>
        db.valtrioxTeamMember.findFirst({
          where: { userId: authCtx.userId, status: "active" },
        })
      );
      if (vtCheck.error) return vtCheck.errorResponse;

      if (!memberCheck.data && !vtCheck.data) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Run all DB queries in parallel via safeDbQuery
    const [
      totalRevenueRes,
      prevRevenueRes,
      orderCountRes,
      prevOrderCountRes,
      activeOrdersRes,
      customerCountRes,
      prevCustomerCountRes,
      newCustomersRes,
      lowStockProductsRes,
      recentOrdersRes,
      dailyRevenueRes,
      orderStatusGroupsRes,
    ] = await Promise.all([
      safeDbQuery(() =>
        db.order.aggregate({
          where: { organizationId: orgId, status: { not: "cancelled" }, createdAt: { gte: thirtyDaysAgo } },
          _sum: { total: true },
        })
      ),
      safeDbQuery(() =>
        db.order.aggregate({
          where: {
            organizationId: orgId,
            status: { not: "cancelled" },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
          _sum: { total: true },
        })
      ),
      safeDbQuery(() =>
        db.order.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } })
      ),
      safeDbQuery(() =>
        db.order.count({ where: { organizationId: orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } })
      ),
      safeDbQuery(() =>
        db.order.count({ where: { organizationId: orgId, status: { notIn: ["cancelled", "delivered"] } } })
      ),
      safeDbQuery(() =>
        db.customer.count({ where: { organizationId: orgId } })
      ),
      safeDbQuery(() =>
        db.customer.count({ where: { organizationId: orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } })
      ),
      safeDbQuery(() =>
        db.customer.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } })
      ),
      safeDbQuery(() =>
        db.product.count({ where: { organizationId: orgId, stock: { lt: 10 }, status: "active" } })
      ),
      safeDbQuery(() =>
        db.order.findMany({
          where: { organizationId: orgId },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { name: true } } },
        })
      ),
      safeDbQuery(() =>
        db.order.findMany({
          where: {
            organizationId: orgId,
            status: { not: "cancelled" },
            createdAt: { gte: sevenDaysAgo },
          },
          select: { total: true, createdAt: true },
        })
      ),
      safeDbQuery(() =>
        db.order.groupBy({
          by: ["status"],
          where: { organizationId: orgId },
          _count: { status: true },
        })
      ),
    ]);

    // Return first error if any query failed
    for (const res of [
      totalRevenueRes, prevRevenueRes, orderCountRes, prevOrderCountRes,
      activeOrdersRes, customerCountRes, prevCustomerCountRes, newCustomersRes,
      lowStockProductsRes, recentOrdersRes, dailyRevenueRes, orderStatusGroupsRes,
    ]) {
      if (res.error) return res.errorResponse;
    }

    const totalRevenue = totalRevenueRes.data!;
    const prevRevenue = prevRevenueRes.data!;
    const orderCount = orderCountRes.data!;
    const prevOrderCount = prevOrderCountRes.data!;
    const activeOrders = activeOrdersRes.data!;
    const customerCount = customerCountRes.data!;
    const prevCustomerCount = prevCustomerCountRes.data!;
    const newCustomers = newCustomersRes.data!;
    const lowStockProducts = lowStockProductsRes.data!;
    const recentOrders = recentOrdersRes.data!;
    const dailyRevenue = dailyRevenueRes.data!;
    const orderStatusGroups = orderStatusGroupsRes.data!;

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
        revenueByDay[key] += Number(order.total);
      }
    }
    const revenueChartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date: new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Math.round(revenue * 100) / 100,
    }));

    const currentRev = Number(totalRevenue._sum.total || 0);
    const prevRev = Number(prevRevenue._sum.total || 0);
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
      delivered: "#D4A73A",
      cancelled: "#ef4444",
      returned: "#f97316",
    };
    const orderStatusData = orderStatusGroups.map((g) => ({
      name: g.status.charAt(0).toUpperCase() + g.status.slice(1),
      value: g._count.status,
      fill: statusColorMap[(g.status || "").toLowerCase()] || "#94a3b8",
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
  } catch (error: unknown) {
    logger.error("Dashboard stats error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) {
      // Return zero/placeholder stats when DB is unavailable
      const now = new Date();
      const revenueChartData: { date: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        revenueChartData.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
        });
      }
      return NextResponse.json({
        totalRevenue: 0,
        revenueChange: 0,
        orderCount: 0,
        orderChange: 0,
        activeOrders: 0,
        customerCount: 0,
        customerChange: 0,
        newCustomers: 0,
        conversionRate: 0,
        avgOrderValue: 0,
        lowStockProducts: 0,
        recentOrders: [],
        revenueChartData,
        orderStatusData: [],
        fallback: true,
      });
    }
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });
