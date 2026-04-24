import { NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/subscriptions/plans — Public: return all active subscription plans
export const GET = withAuth(async () => {
  try {
    logger.info("[Subscriptions Plans] GET request");
    await ensureDb();

    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const formatted = plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      annualPrice: p.annualPrice || 0,
      period: p.period,
      features: JSON.parse(p.features || "[]"),
      teamLimit: p.teamLimit,
      orderLimit: p.orderLimit,
      productLimit: p.productLimit,
      trialDays: p.trialDays,
      // Calculate savings for annual plan
      annualSavings: p.annualPrice > 0 && p.price > 0
        ? Math.round((1 - p.annualPrice / (p.price * 12)) * 100)
        : 0,
    }));

    return NextResponse.json({ plans: formatted });
  } catch (error: any) {
    console.error("Fetch plans error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}, { allowPublic: true });
