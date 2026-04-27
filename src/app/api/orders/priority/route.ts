import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ── Priority Scoring Algorithm ──

function calculatePriorityScore(order: {
  total: number;
  createdAt: Date;
  channel: string;
  status: string;
}): { score: number; level: string; breakdown: { revenue: number; age: number; channel: number; status: number } } {
  // Revenue weight
  const revenue = order.total > 10000 ? 30 : order.total > 5000 ? 22 : order.total > 2000 ? 14 : 6;

  // Age weight
  const ageMs = Date.now() - order.createdAt.getTime();
  const ageHrs = ageMs / (1000 * 60 * 60);
  const age = ageHrs > 48 ? 40 : ageHrs > 24 ? 28 : ageHrs > 12 ? 16 : 8;

  // Channel weight
  const ch = (order.channel || "manual").toLowerCase();
  const channel = ch === "whatsapp" || ch === "walk-in" ? 20 : ch === "website" ? 18 : ch === "instagram" || ch === "facebook" ? 16 : 10;

  // Status weight
  const st = (order.status || "pending").toLowerCase();
  const statusWeight = st === "pending" ? 10 : st === "packed" ? 8 : st === "confirmed" ? 6 : st === "dispatched" ? 4 : 0;

  const score = revenue + age + channel + statusWeight;

  // Priority level
  const level = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  return { score, level, breakdown: { revenue, age, channel, status: statusWeight } };
}

function formatAge(createdAt: Date): string {
  const ms = Date.now() - createdAt.getTime();
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24);
    const remainHrs = hrs % 24;
    return `${days}d ${remainHrs}h`;
  }
  return `${hrs}h ${mins}m`;
}

// ── GET: Returns all orders with priority scores ──

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;
    const statusFilter = searchParams.get("status");
    const priorityFilter = searchParams.get("priority");

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: any = {
      organizationId: orgId,
      status: { notIn: ["cancelled"] },
    };

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate priority for each order
    const ordersWithPriority = orders.map((order) => {
      const priority = calculatePriorityScore({
        total: order.total,
        createdAt: order.createdAt,
        channel: order.channel,
        status: order.status,
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || "Unknown",
        customerPhone: order.customer?.phone || null,
        total: order.total,
        channel: order.channel,
        status: order.status,
        priorityScore: priority.score,
        priorityLevel: priority.level,
        priorityBreakdown: priority.breakdown,
        ageFormatted: formatAge(order.createdAt),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    });

    // Sort by priority score (highest first)
    ordersWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);

    // Apply priority filter if specified
    const filteredOrders = priorityFilter && priorityFilter !== "all"
      ? ordersWithPriority.filter((o) => o.priorityLevel === priorityFilter)
      : ordersWithPriority;

    // Summary stats
    const summary = {
      total: ordersWithPriority.length,
      critical: ordersWithPriority.filter((o) => o.priorityLevel === "critical").length,
      high: ordersWithPriority.filter((o) => o.priorityLevel === "high").length,
      medium: ordersWithPriority.filter((o) => o.priorityLevel === "medium").length,
      low: ordersWithPriority.filter((o) => o.priorityLevel === "low").length,
    };

    return NextResponse.json({
      orders: filteredOrders,
      summary,
    });
  } catch (error: any) {
    logger.error("Priority orders error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to calculate priority scores" }, { status: 500 });
  }
});
