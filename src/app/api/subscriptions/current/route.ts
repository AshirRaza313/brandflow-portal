import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/subscriptions/current — Return current org's subscription + plan details
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Subscriptions Current] GET request", { userId: authCtx.userId });
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId!;

    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if organization is banned
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { isBanned: true, banReason: true, isActive: true },
    });
    if (org?.isBanned) {
      return NextResponse.json({
        error: "Organization is banned",
        banReason: org.banReason,
        subscription: null,
      }, { status: 403 });
    }

    // Get subscription with plan details
    const subscription = await db.subscription.findUnique({
      where: { organizationId: orgId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    // If no subscription exists, create a trial one with the starter plan
    if (!subscription) {
      const starterPlan = await db.subscriptionPlan.findUnique({
        where: { name: "starter" },
      });

      if (!starterPlan) {
        return NextResponse.json({ error: "No plans configured" }, { status: 500 });
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + starterPlan.trialDays * 24 * 60 * 60 * 1000);

      const newSubscription = await db.subscription.create({
        data: {
          organizationId: orgId,
          planId: starterPlan.id,
          status: "trial",
          billingCycle: "monthly",
          trialStartsAt: now,
          trialEndsAt: trialEnd,
        },
        include: {
          plan: true,
          payments: true,
        },
      });

      return NextResponse.json({
        subscription: formatSubscription(newSubscription),
        platformSettings: await getPlatformSettings(),
      });
    }

    // ── AUTO-EXPIRE CHECK ──
    // If subscription is "active" and currentPeriodEnd has passed, mark as expired
    if (subscription.status === "active" && subscription.currentPeriodEnd) {
      const now = new Date();
      if (new Date(subscription.currentPeriodEnd) < now) {
        // Auto-expire and downgrade to starter
        const starterPlan = await db.subscriptionPlan.findUnique({
          where: { name: "starter" },
        });

        const updatedSubscription = await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "expired",
            planId: starterPlan?.id || subscription.planId,
            billingCycle: "monthly",
            lastReminderAt: null,
            reminderCount: 0,
          },
          include: {
            plan: true,
            payments: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });

        // Update organization plan to starter
        await db.organization.update({
          where: { id: orgId },
          data: { plan: "starter" },
        });

        // Notify organization about expiry
        await db.notification.create({
          data: {
            type: "warning",
            title: "Subscription Expired",
            message: "Your subscription has expired and you have been moved to the Starter plan. To continue using premium features, please renew your subscription.",
            orgId: orgId,
            actionUrl: "/billing",
          },
        });

        return NextResponse.json({
          subscription: formatSubscription(updatedSubscription),
          platformSettings: await getPlatformSettings(),
        });
      }
    }

    // ── AUTO-EXPIRE TRIAL CHECK ──
    if (subscription.status === "trial" && new Date(subscription.trialEndsAt) < new Date()) {
      const updatedSubscription = await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "expired" },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      await db.notification.create({
        data: {
          type: "warning",
          title: "Trial Expired",
          message: "Your free trial has expired. Upgrade to continue using premium features.",
          orgId: orgId,
          actionUrl: "/billing",
        },
      });

      return NextResponse.json({
        subscription: formatSubscription(updatedSubscription),
        platformSettings: await getPlatformSettings(),
      });
    }

    return NextResponse.json({
      subscription: formatSubscription(subscription),
      platformSettings: await getPlatformSettings(),
    });
  } catch (error: any) {
    console.error("Fetch current subscription error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
});

function formatSubscription(sub: any) {
  const now = new Date();
  const isTrialActive = sub.status === "trial" && new Date(sub.trialEndsAt) > now;
  const trialDaysRemaining = isTrialActive
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate days until renewal
  let daysUntilRenewal = 0;
  if (sub.status === "active" && sub.currentPeriodEnd) {
    const periodEnd = new Date(sub.currentPeriodEnd);
    if (periodEnd > now) {
      daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  return {
    id: sub.id,
    status: sub.status,
    billingCycle: sub.billingCycle || "monthly",
    trialStartsAt: sub.trialStartsAt,
    trialEndsAt: sub.trialEndsAt,
    trialDaysRemaining,
    isTrialActive,
    currentPeriodEnd: sub.currentPeriodEnd,
    daysUntilRenewal,
    reminderCount: sub.reminderCount || 0,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      price: sub.plan.price,
      annualPrice: sub.plan.annualPrice || 0,
      period: sub.plan.period,
      features: JSON.parse(sub.plan.features || "[]"),
      teamLimit: sub.plan.teamLimit,
      orderLimit: sub.plan.orderLimit,
      productLimit: sub.plan.productLimit,
      trialDays: sub.plan.trialDays,
    },
    payments: (sub.payments || []).map((p: any) => ({
      id: p.id,
      planName: p.planName,
      amount: p.amount,
      transactionId: p.transactionId,
      paymentMethod: p.paymentMethod,
      billingCycle: p.billingCycle || "monthly",
      status: p.status,
      adminNote: p.adminNote,
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    })),
  };
}

async function getPlatformSettings() {
  try {
    const settings = await db.platformSettings.findFirst();
    if (!settings) return null;
    return {
      companyName: settings.companyName,
      companyEmail: settings.companyEmail,
      companyPhone: settings.companyPhone,
      supportHours: settings.supportHours,
      whatsappNumber: settings.whatsappNumber,
      paymentMethods: JSON.parse(settings.paymentMethods || "[]"),
      currency: settings.currency,
      companyAddress: settings.companyAddress,
    };
  } catch {
    return null;
  }
}
