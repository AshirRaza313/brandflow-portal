import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Smart Stock Alerts API
// Calculates average daily sales velocity over the last 7 days
// Predicts when stock will run out and assigns urgency levels
// ─────────────────────────────────────────────────────────────────────────────

type UrgencyLevel = "low" | "medium" | "high" | "critical";

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysUntilOutOfStock: number | null;
  urgency: UrgencyLevel;
  category: string | null;
  price: number;
  imageUrl: string | null;
}

export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Products] Stock Alerts GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = authCtx.organizationId!;
    const urgencyFilter = searchParams.get("urgency"); // optional: filter by urgency

    // ── Get all active products ──
    const products = await db.product.findMany({
      where: { organizationId: orgId, status: "active" },
      select: {
        id: true,
        name: true,
        stock: true,
        category: true,
        price: true,
        imageUrl: true,
      },
    });

    // ── Calculate date range: last 7 days ──
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Get order items for the last 7 days ──
    const orderItems = await db.orderItem.findMany({
      where: {
        order: {
          organizationId: orgId,
          createdAt: { gte: sevenDaysAgo },
          status: { not: "cancelled" },
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    // ── Calculate average daily sales per product ──
    const salesByProduct: Record<string, number> = {};
    for (const item of orderItems) {
      salesByProduct[item.productId] = (salesByProduct[item.productId] || 0) + item.quantity;
    }

    // avg daily = total sold over 7 days / 7
    const avgDailySales: Record<string, number> = {};
    for (const [productId, totalSold] of Object.entries(salesByProduct)) {
      avgDailySales[productId] = totalSold / 7;
    }

    // ── Generate alerts ──
    const alerts: StockAlert[] = [];

    for (const product of products) {
      const avg = avgDailySales[product.id] || 0;

      // Skip products with zero stock and no sales (already out of stock with no demand)
      if (product.stock === 0 && avg === 0) continue;

      // Skip products with very high stock and no sales
      if (product.stock > 50 && avg === 0) continue;

      let daysUntilOutOfStock: number | null = null;
      if (avg > 0) {
        daysUntilOutOfStock = Math.floor(product.stock / avg);
      }

      // Determine urgency
      let urgency: UrgencyLevel = "low";

      if (product.stock === 0 && avg > 0) {
        urgency = "critical";
      } else if (daysUntilOutOfStock !== null) {
        if (daysUntilOutOfStock <= 2) {
          urgency = "critical";
        } else if (daysUntilOutOfStock <= 5) {
          urgency = "high";
        } else if (daysUntilOutOfStock <= 14) {
          urgency = "medium";
        } else {
          urgency = "low";
        }
      } else if (product.stock <= 5) {
        urgency = "high";
      } else if (product.stock <= 15) {
        urgency = "medium";
      }

      alerts.push({
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        avgDailySales: Math.round(avg * 100) / 100,
        daysUntilOutOfStock,
        urgency,
        category: product.category,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }

    // Sort by urgency (critical first), then by days until out of stock
    const urgencyOrder: Record<UrgencyLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return (a.daysUntilOutOfStock ?? 999) - (b.daysUntilOutOfStock ?? 999);
    });

    // Apply urgency filter if provided
    const filtered = urgencyFilter
      ? alerts.filter((a) => a.urgency === urgencyFilter)
      : alerts;

    // Summary counts
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.urgency === "critical").length,
      high: alerts.filter((a) => a.urgency === "high").length,
      medium: alerts.filter((a) => a.urgency === "medium").length,
      low: alerts.filter((a) => a.urgency === "low").length,
    };

    return NextResponse.json({ alerts: filtered, summary });
  } catch (error: any) {
    console.error("Stock alerts error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch stock alerts" }, { status: 500 });
  }
});
