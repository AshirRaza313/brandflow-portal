import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/subscriptions — List all subscriptions (admin management)
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Subscriptions] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const plan = searchParams.get("plan");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause
    const where: any = {};
    if (status && status !== "all") where.status = status;

    if (plan && plan !== "all") {
      where.plan = { name: plan };
    }

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true, name: true, email: true, phone: true, logo: true,
              plan: true, isBanned: true, banReason: true, paymentRejectionCount: true,
              createdAt: true,
            },
          },
          plan: { select: { id: true, name: true, price: true, annualPrice: true, period: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, status: true, amount: true, planName: true, billingCycle: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.subscription.count({ where }),
    ]);

    // Stats
    const allSubs = await db.subscription.findMany({
      include: { plan: { select: { name: true } } },
    });

    const stats = {
      total: allSubs.length,
      trial: allSubs.filter((s) => s.status === "trial").length,
      active: allSubs.filter((s) => s.status === "active").length,
      pending_payment: allSubs.filter((s) => s.status === "pending_payment").length,
      expired: allSubs.filter((s) => s.status === "expired").length,
      cancelled: allSubs.filter((s) => s.status === "cancelled").length,
      banned: allSubs.filter((s) => s.organization?.isBanned).length,
      monthly_active: allSubs.filter((s) => s.status === "active" && s.billingCycle === "monthly").length,
      annual_active: allSubs.filter((s) => s.status === "active" && s.billingCycle === "annually").length,
      monthly_revenue: allSubs
        .filter((s) => s.status === "active" && s.billingCycle === "monthly")
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0),
      annual_revenue: allSubs
        .filter((s) => s.status === "active" && s.billingCycle === "annually")
        .reduce((sum, s) => sum + (s.plan?.annualPrice || s.plan?.price || 0), 0),
    };

    const formatted = subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      billingCycle: sub.billingCycle || "monthly",
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      reminderCount: sub.reminderCount || 0,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      organization: sub.organization,
      plan: sub.plan,
      recentPayments: sub.payments,
    }));

    return NextResponse.json({
      subscriptions: formatted,
      stats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Admin subscriptions list error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
