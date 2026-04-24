import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { getCurrencyForCountry } from "@/lib/currency";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/reports/customers?orgId=xxx
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Reports Customers] GET request", { userId: authCtx.userId });
    await ensureDb();
    const orgId = req.nextUrl.searchParams.get("orgId") || authCtx.organizationId!;

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all customers for the org
    const customers = await db.customer.findMany({
      where: { organizationId: orgId },
      include: {
        orders: {
          where: { createdAt: { gte: monthStart } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch all-time orders for LTV calculation
    const allOrders = await db.order.findMany({
      where: { organizationId: orgId },
      include: { items: true },
    });

    // Total customers
    const totalCustomers = customers.length;

    // New customers this month
    const newThisMonth = customers.filter(
      (c) => c.createdAt >= monthStart
    ).length;

    // Retention rate: customers with >1 order / customers with at least 1 order
    const customersWithOrders = customers.filter((c) => c.orderCount > 0);
    const repeatCustomers = customers.filter((c) => c.orderCount > 1);
    const retentionRate = customersWithOrders.length > 0
      ? Math.round((repeatCustomers.length / customersWithOrders.length) * 100)
      : 0;

    // Avg LTV
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLTV = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

    // Customer acquisition table (last 30 customers)
    const recentCustomers = customers.slice(0, 30).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount,
      loyaltyTier: c.loyaltyTier,
      createdAt: c.createdAt,
    }));

    // Loyalty tier distribution
    const tierBreakdown = customers.reduce<Record<string, number>>((acc, c) => {
      acc[c.loyaltyTier] = (acc[c.loyaltyTier] || 0) + 1;
      return acc;
    }, {});

    // City distribution
    const cityBreakdown = customers.reduce<Record<string, number>>((acc, c) => {
      const city = c.city || "Unknown";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});

    // Top customers by spend
    const topCustomers = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        loyaltyTier: c.loyaltyTier,
      }));

    // Get org currency
    const org = await db.organization.findUnique({ where: { id: orgId } });
    const currency = getCurrencyForCountry(org?.country || "PK");

    return NextResponse.json({
      stats: {
        totalCustomers,
        newThisMonth,
        retentionRate,
        avgLTV: Math.round(avgLTV * 100) / 100,
        totalSpent,
      },
      recentCustomers,
      tierBreakdown,
      cityBreakdown,
      topCustomers,
      currency: { code: currency.code, symbol: currency.symbol },
    });
  } catch (error: any) {
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch customer report" }, { status: 500 });
  }
});
