import { NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Revenue vs Expenses (last 30 days, grouped by week)
    const orders = await db.order.findMany({
      where: { organizationId: orgId, status: { not: "cancelled" }, createdAt: { gte: thirtyDaysAgo } },
      select: { total: true, createdAt: true, channel: true },
    });

    const expenses = await db.expense.findMany({
      where: { organizationId: orgId, date: { gte: thirtyDaysAgo } },
      select: { amount: true, category: true, date: true },
    });

    // Weekly revenue
    const weeklyRevenue: Record<string, number> = {};
    const weeklyExpenses: Record<string, number> = {};
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const key = `Week ${4 - i}`;
      weeklyRevenue[key] = 0;
      weeklyExpenses[key] = 0;

      for (const o of orders) {
        if (o.createdAt >= weekStart && o.createdAt < new Date(weekStart.getTime() + 7 * 86400000)) {
          weeklyRevenue[key] += o.total;
        }
      }
      for (const e of expenses) {
        if (e.date >= weekStart && e.date < new Date(weekStart.getTime() + 7 * 86400000)) {
          weeklyExpenses[key] += e.amount;
        }
      }
    }

    const revenueVsExpenses = Object.entries(weeklyRevenue).map(([week, revenue]) => ({
      week,
      revenue: Math.round(revenue),
      expenses: Math.round(weeklyExpenses[week]),
    }));

    // Orders by channel
    const channelCounts: Record<string, number> = {};
    for (const o of orders) {
      channelCounts[o.channel] = (channelCounts[o.channel] || 0) + 1;
    }
    const ordersByChannel = Object.entries(channelCounts).map(([channel, count]) => ({
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      count,
    }));

    // Order status breakdown
    const statusCounts = await db.order.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    });
    const orderStatusBreakdown = statusCounts.map((s) => ({
      status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      count: s._count,
    }));

    // Top selling products
    const topProducts = await db.orderItem.groupBy({
      by: ["productName"],
      where: {
        order: { organizationId: orgId, status: { not: "cancelled" } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    });

    // Expense by category
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
    const expenseCategoryData = Object.entries(expenseByCategory).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount: Math.round(amount),
    }));

    // Customer tier distribution
    const tierCounts = await db.customer.groupBy({
      by: ["loyaltyTier"],
      where: { organizationId: orgId },
      _count: true,
    });
    const customerTierDistribution = tierCounts.map((t) => ({
      tier: t.loyaltyTier.charAt(0).toUpperCase() + t.loyaltyTier.slice(1),
      count: t._count,
    }));

    // Top customers by spend
    const topCustomers = await db.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { totalSpent: "desc" },
      take: 5,
      select: { name: true, totalSpent: true, orderCount: true },
    });

    // Monthly new customers (last 6 months)
    const monthlyNewCustomers: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const key = mStart.toLocaleDateString("en-US", { month: "short" });
      monthlyNewCustomers[key] = await db.customer.count({
        where: { organizationId: orgId, createdAt: { gte: mStart, lt: mEnd } },
      });
    }
    const newCustomersData = Object.entries(monthlyNewCustomers).map(([month, count]) => ({
      month,
      count,
    }));

    return NextResponse.json({
      revenueVsExpenses,
      ordersByChannel,
      orderStatusBreakdown,
      topProducts,
      expenseCategoryData,
      customerTierDistribution,
      topCustomers,
      newCustomersData,
      totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
    });
  } catch (error: any) {
    logger.error("Analytics error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
});
