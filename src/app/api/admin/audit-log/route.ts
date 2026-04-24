import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ============================================================================
// Audit Log API — Generates activity from existing data
// Since there's no AuditLog table, we synthesize activity entries from
// Orders, Products, Customers, Team Members, and Sessions.
// ============================================================================

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  module: "orders" | "products" | "customers" | "team" | "settings";
  details: string;
}

export const GET = withAuth(async (request: NextRequest, authCtx) => {
  logger.info("[Admin Audit Log] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const moduleFilterParam = searchParams.get("module"); // orders, products, customers, team, settings
    const dateRange = searchParams.get("dateRange") || "last30days";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const searchQuery = searchParams.get("search") || "";

    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // ── Compute date filter ──
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "last30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "last90days":
        startDate.setDate(now.getDate() - 90);
        break;
      case "custom": {
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        if (from) startDate = new Date(from);
        else startDate.setDate(now.getDate() - 30);
        // endDate is handled in filtering below
        break;
      }
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let endDate = new Date();
    if (dateRange === "custom") {
      const to = searchParams.get("to");
      if (to) endDate = new Date(to);
    }

    const activities: AuditEntry[] = [];

    // ── Orders Activity ──
    if (!moduleFilterParam || moduleFilterParam === "orders") {
      const orders = await db.order.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          customer: { select: { name: true } },
          items: { select: { productName: true, quantity: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      for (const order of orders) {
        // Order created
        activities.push({
          id: `order-created-${order.id}`,
          action: "order.created",
          description: `Order #${order.orderNumber} created`,
          user: "System",
          timestamp: order.createdAt.toISOString(),
          module: "orders",
          details: `Total: Rs. ${order.total.toLocaleString()} · ${order.items.length} item(s) · ${order.channel}`,
        });

        // Status change (simulated if order is not pending)
        if (order.status && order.status !== "pending" && order.updatedAt > order.createdAt) {
          activities.push({
            id: `order-status-${order.id}`,
            action: "order.status_changed",
            description: `Order #${order.orderNumber} status changed to ${order.status}`,
            user: "Admin",
            timestamp: order.updatedAt.toISOString(),
            module: "orders",
            details: `Previous status: pending → ${order.status}`,
          });
        }
      }
    }

    // ── Products Activity ──
    if (!moduleFilterParam || moduleFilterParam === "products") {
      const products = await db.product.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      for (const product of products) {
        activities.push({
          id: `product-created-${product.id}`,
          action: "product.created",
          description: `Product "${product.name}" created`,
          user: "Admin",
          timestamp: product.createdAt.toISOString(),
          module: "products",
          details: `SKU: ${product.sku || "N/A"} · Price: Rs. ${product.price.toLocaleString()} · Stock: ${product.stock}`,
        });

        // If product was updated after creation
        if (product.updatedAt > product.createdAt) {
          activities.push({
            id: `product-updated-${product.id}`,
            action: "product.updated",
            description: `Product "${product.name}" updated`,
            user: "Admin",
            timestamp: product.updatedAt.toISOString(),
            module: "products",
            details: `Price: Rs. ${product.price.toLocaleString()} · Stock: ${product.stock} · Status: ${product.status}`,
          });
        }
      }
    }

    // ── Customers Activity ──
    if (!moduleFilterParam || moduleFilterParam === "customers") {
      const customers = await db.customer.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      for (const customer of customers) {
        activities.push({
          id: `customer-created-${customer.id}`,
          action: "customer.created",
          description: `Customer "${customer.name}" added`,
          user: "Admin",
          timestamp: customer.createdAt.toISOString(),
          module: "customers",
          details: `${customer.email || customer.phone || "No contact"} · City: ${customer.city || "N/A"} · Tier: ${customer.loyaltyTier}`,
        });

        if (customer.updatedAt > customer.createdAt) {
          activities.push({
            id: `customer-updated-${customer.id}`,
            action: "customer.updated",
            description: `Customer "${customer.name}" updated`,
            user: "Admin",
            timestamp: customer.updatedAt.toISOString(),
            module: "customers",
            details: `Total Spent: Rs. ${customer.totalSpent.toLocaleString()} · Orders: ${customer.orderCount} · Tier: ${customer.loyaltyTier}`,
          });
        }
      }
    }

    // ── Team Activity ──
    if (!moduleFilterParam || moduleFilterParam === "team") {
      const members = await db.organizationMember.findMany({
        where: {
          organizationId: orgId,
          joinedAt: { gte: startDate, lte: endDate },
        },
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { joinedAt: "desc" },
        take: 20,
      });

      for (const member of members) {
        activities.push({
          id: `team-invited-${member.id}`,
          action: "team.invited",
          description: `${member.user.name} joined the team as ${member.role}`,
          user: "Owner",
          timestamp: member.joinedAt.toISOString(),
          module: "team",
          details: `Email: ${member.user.email} · Role: ${member.role}`,
        });
      }
    }

    // ── Settings Activity (simulated — from organization member updates) ──
    if (!moduleFilterParam || moduleFilterParam === "settings") {
      // Check for recent organization members updated (as proxy for settings activity)
      // Only include members belonging to this organization
      const recentMembers = await db.organizationMember.findMany({
        where: {
          organizationId: orgId,
          joinedAt: { lte: endDate },
        },
        include: {
          user: { select: { id: true, name: true, email: true, updatedAt: true, createdAt: true } },
        },
        orderBy: { joinedAt: "desc" },
        take: 20,
      });

      for (const member of recentMembers) {
        const u = member.user;
        if (u.updatedAt > u.createdAt) {
          activities.push({
            id: `settings-updated-${u.id}`,
            action: "settings.updated",
            description: `Account settings updated for ${u.name}`,
            user: u.name,
            timestamp: u.updatedAt.toISOString(),
            module: "settings",
            details: `Email: ${u.email} · Role: ${member.role}`,
          });
        }
      }

      // If no settings activity found, add a generic entry
      if (activities.filter(a => a.module === "settings").length === 0) {
        activities.push({
          id: "settings-initial",
          action: "settings.updated",
          description: "System initialized",
          user: "System",
          timestamp: startDate.toISOString(),
          module: "settings",
          details: "Portal setup completed",
        });
      }
    }

    // ── Sort by timestamp descending ──
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // ── Search filter ──
    let filtered = activities;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = activities.filter(
        (a) =>
          a.action.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.user.toLowerCase().includes(q) ||
          a.details.toLowerCase().includes(q)
      );
    }

    // ── Module filter ──
    if (moduleFilterParam && moduleFilterParam !== "all") {
      filtered = filtered.filter((a) => a.module === moduleFilterParam);
    }

    // ── Pagination ──
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    // ── Stats ──
    const stats = {
      total,
      byModule: {
        orders: activities.filter((a) => a.module === "orders").length,
        products: activities.filter((a) => a.module === "products").length,
        customers: activities.filter((a) => a.module === "customers").length,
        team: activities.filter((a) => a.module === "team").length,
        settings: activities.filter((a) => a.module === "settings").length,
      },
    };

    return NextResponse.json({
      activities: paginated,
      stats,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error: any) {
    console.error("Audit log API error:", error?.message || error);
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json(
      { error: error?.message || "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
