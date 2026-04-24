import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/clients — Admin-only: return all organizations with stats
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Clients] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();

    // Fetch all organizations with counts (single query — no N+1)
    const organizations = await db.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            products: true,
            orders: true,
            customers: true,
            expenses: true,
            teamTasks: true,
            coupons: true,
          },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, image: true },
            },
          },
          take: 1,
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Batch queries — instead of N sub-queries per org, do 3 batch queries total
    const orgIds = organizations.map((org) => org.id);

    // Batch 1: Revenue totals per org
    const revenueByOrg = orgIds.length > 0
      ? await db.order.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: orgIds } },
          _sum: { total: true },
        })
      : [];

    const revenueMap = new Map(revenueByOrg.map((r) => [r.organizationId, r._sum.total || 0]));

    // Batch 2: Orders this month per org
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyOrdersByOrg = orgIds.length > 0
      ? await db.order.groupBy({
          by: ["organizationId"],
          where: {
            organizationId: { in: orgIds },
            createdAt: { gte: firstOfMonth },
          },
          _count: true,
        })
      : [];

    const monthlyOrdersMap = new Map(monthlyOrdersByOrg.map((r) => [r.organizationId, r._count]));

    // Batch 3: Last order date per org (use distinct + order)
    const lastOrdersByOrg = orgIds.length > 0
      ? await db.order.findMany({
          where: { organizationId: { in: orgIds } },
          distinct: ["organizationId"],
          orderBy: { createdAt: "desc" },
          select: { organizationId: true, createdAt: true },
        })
      : [];

    const lastOrderMap = new Map(lastOrdersByOrg.map((r) => [r.organizationId, r.createdAt]));

    // Build client data from the batched results
    const clients = organizations.map((org) => {
      const plan = org.plan || "starter";

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        email: org.email,
        phone: org.phone,
        website: org.website,
        plan,
        currency: org.currency,
        timezone: org.timezone,
        isActive: org.isActive,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        // Owner / first member info
        owner: org.members[0]?.user
          ? {
              id: org.members[0].user.id,
              name: org.members[0].user.name,
              email: org.members[0].user.email,
              role: org.members[0].role,
            }
          : null,
        // Stats
        memberCount: org._count.members,
        productCount: org._count.products,
        orderCount: org._count.orders,
        customerCount: org._count.customers,
        expenseCount: org._count.expenses,
        revenueTotal: revenueMap.get(org.id) || 0,
        ordersThisMonth: monthlyOrdersMap.get(org.id) || 0,
        lastActivity: lastOrderMap.get(org.id) || org.updatedAt,
      };
    });

    // Summary stats
    const totalClients = clients.length;
    const newThisMonth = clients.filter((c) => new Date(c.createdAt) >= firstOfMonth).length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.revenueTotal, 0);
    const totalOrders = clients.reduce((sum, c) => sum + c.orderCount, 0);

    // Plan distribution for pie chart
    const planDistribution: Record<string, number> = {};
    for (const c of clients) {
      planDistribution[c.plan] = (planDistribution[c.plan] || 0) + 1;
    }

    return NextResponse.json({
      clients,
      summary: {
        totalClients,
        newThisMonth,
        totalRevenue,
        totalOrders,
        planDistribution,
      },
    });
  } catch (error: any) {
    console.error("Admin clients API error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: "Failed to fetch client data" },
      { status: 500 }
    );
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
