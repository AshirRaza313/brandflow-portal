import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/clients/[id]/orders — Admin-only: paginated orders for an organization
export const GET = withAuth(async (req: NextRequest, authCtx, context) => {
  const { id } = await context.params;
  logger.info("[Admin Client Orders] GET request", { userId: authCtx.userId, clientId: id });
  try {
    await ensureDb();

    // Parse query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || undefined;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    // Verify org exists
    const org = await db.organization.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Build where clause
    const where: Record<string, any> = { organizationId: id };
    if (status) {
      where.status = status;
    }

    // Fetch orders with pagination
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    // Calculate order status distribution
    const statusCounts = await db.order.groupBy({
      by: ["status"],
      where: { organizationId: id },
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count;
    }

    // Revenue summary
    const revenueSummary = await db.order.aggregate({
      where: { organizationId: id },
      _sum: { total: true, subtotal: true, discount: true },
    });

    return NextResponse.json({
      organization: { id: org.id, name: org.name },
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      statusCounts: statusMap,
      revenueSummary: {
        totalRevenue: revenueSummary._sum.total || 0,
        totalSubtotal: revenueSummary._sum.subtotal || 0,
        totalDiscount: revenueSummary._sum.discount || 0,
      },
    });
  } catch (error: any) {
    console.error("Admin client orders API error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch client orders" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
