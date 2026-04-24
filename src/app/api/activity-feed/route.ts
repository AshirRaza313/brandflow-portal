import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Activity Feed API
// Returns recent activities from orders, products, team, payments
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "order" | "product" | "customer" | "team" | "payment" | "coupon";
  action: string;
  description: string;
  details: string;
  icon: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Activity Feed] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId!;
    const limit = parseInt(searchParams.get("limit") || "25");

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ── Fetch recent activities from different sources ──
    const timeLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const [recentOrders, recentProducts, recentCustomers, recentInvitations, recentPayments] = await Promise.all([
      // Recent orders (last 20)
      db.order.findMany({
        where: { organizationId: orgId, createdAt: { gte: timeLimit } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          channel: true,
          customer: { select: { name: true } },
        },
      }),
      // Recent product changes (last 10)
      db.product.findMany({
        where: { organizationId: orgId, createdAt: { gte: timeLimit } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          stock: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Recent customers (last 10)
      db.customer.findMany({
        where: { organizationId: orgId, createdAt: { gte: timeLimit } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
          totalSpent: true,
        },
      }),
      // Recent team invitations
      db.teamInvitation.findMany({
        where: { organizationId: orgId, createdAt: { gte: timeLimit } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          inviteeName: true,
          role: true,
          status: true,
          invitedAt: true,
          acceptedAt: true,
        },
      }),
      // Recent payment proofs
      db.paymentProof.findMany({
        where: { organizationId: orgId, createdAt: { gte: timeLimit } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          planName: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // ── Build activity feed ──
    const activities: ActivityItem[] = [];

    // Orders
    for (const order of recentOrders) {
      const customerName = order.customer?.name || "Walk-in Customer";
      activities.push({
        id: `order-${order.id}`,
        type: "order",
        action: "New order received",
        description: `Order ${order.orderNumber} from ${customerName}`,
        details: `Rs. ${order.total.toLocaleString()} · ${order.channel} · ${order.status}`,
        icon: "ShoppingBag",
        timestamp: order.createdAt.toISOString(),
        meta: { orderId: order.id, orderNumber: order.orderNumber, status: order.status },
      });
    }

    // Products
    for (const product of recentProducts) {
      const isNew = product.createdAt.getTime() === product.updatedAt.getTime() ||
        (product.updatedAt.getTime() - product.createdAt.getTime()) < 2000;

      if (isNew) {
        activities.push({
          id: `product-${product.id}`,
          type: "product",
          action: "New product added",
          description: `${product.name} added to catalog`,
          details: `Rs. ${product.price.toLocaleString()} · Stock: ${product.stock}`,
          icon: "Package",
          timestamp: product.createdAt.toISOString(),
          meta: { productId: product.id },
        });
      } else {
        activities.push({
          id: `product-${product.id}`,
          type: "product",
          action: "Product updated",
          description: `${product.name} was updated`,
          details: `Stock: ${product.stock} · Status: ${product.status}`,
          icon: "Package",
          timestamp: product.updatedAt.toISOString(),
          meta: { productId: product.id },
        });
      }
    }

    // Customers
    for (const customer of recentCustomers) {
      activities.push({
        id: `customer-${customer.id}`,
        type: "customer",
        action: "New customer joined",
        description: `${customer.name} started shopping`,
        details: customer.totalSpent > 0 ? `Total spent: Rs. ${customer.totalSpent.toLocaleString()}` : "New customer",
        icon: "Users",
        timestamp: customer.createdAt.toISOString(),
        meta: { customerId: customer.id },
      });
    }

    // Team invitations
    for (const invite of recentInvitations) {
      if (invite.status === "accepted") {
        activities.push({
          id: `team-${invite.id}`,
          type: "team",
          action: "Team member joined",
          description: `${invite.inviteeName} joined as ${invite.role}`,
          details: "Accepted invitation",
          icon: "UserPlus",
          timestamp: (invite.acceptedAt || invite.invitedAt).toISOString(),
          meta: { role: invite.role },
        });
      } else if (invite.status === "pending") {
        activities.push({
          id: `team-${invite.id}`,
          type: "team",
          action: "Team invitation sent",
          description: `Invited ${invite.inviteeName} as ${invite.role}`,
          details: "Pending acceptance",
          icon: "UserPlus",
          timestamp: invite.invitedAt.toISOString(),
          meta: { role: invite.role },
        });
      }
    }

    // Payments
    for (const payment of recentPayments) {
      const statusLabel = payment.status === "approved" ? "approved" :
        payment.status === "rejected" ? "rejected" : "pending review";
      activities.push({
        id: `payment-${payment.id}`,
        type: "payment",
        action: `Payment ${statusLabel}`,
        description: `${payment.planName} plan payment`,
        details: `Rs. ${payment.amount.toLocaleString()} · ${statusLabel}`,
        icon: payment.status === "approved" ? "CheckCircle" : "CreditCard",
        timestamp: payment.createdAt.toISOString(),
        meta: { plan: payment.planName, amount: payment.amount },
      });
    }

    // ── Sort all activities by timestamp (most recent first) ──
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit results
    const limited = activities.slice(0, limit);

    return NextResponse.json({ activities: limited, total: activities.length });
  } catch (error: any) {
    console.error("Activity feed error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch activity feed" }, { status: 500 });
  }
});
