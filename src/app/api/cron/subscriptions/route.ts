import { NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";

// GET /api/cron/subscriptions — Cron job for subscription management
// Called by Vercel Cron daily
// Handles:
//   1. Send renewal reminders (7 days before, 3 days before, 1 day before)
//   2. For annual plans: 7 days and 3 days before year ends
//   3. Auto-expire subscriptions that have passed their period end
//   4. Auto-downgrade expired subscriptions to starter plan
export async function GET(req: Request) {
  try {
    // ── CRON AUTH (Vercel Cron header) ──
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without auth
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await ensureDb();
    const now = new Date();
    const results = {
      reminders_sent: 0,
      expired: 0,
      downgraded: 0,
      errors: [] as string[],
    };

    // ── STEP 1: SEND RENEWAL REMINDERS ──
    const activeSubscriptions = await db.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: { not: null },
      },
      include: {
        organization: {
          select: { id: true, name: true, email: true, phone: true, isBanned: true },
        },
        plan: true,
      },
    });

    for (const sub of activeSubscriptions) {
      if (!sub.currentPeriodEnd || sub.organization.isBanned) continue;

      const periodEnd = new Date(sub.currentPeriodEnd);
      if (periodEnd <= now) continue; // Already expired, handle in step 2

      const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine reminder thresholds based on billing cycle
      const isAnnual = sub.billingCycle === "annually";
      const reminderThresholds = isAnnual ? [30, 14, 7, 3, 1] : [7, 3, 1];

      if (reminderThresholds.includes(daysUntilExpiry)) {
        // Don't send duplicate reminders for the same threshold
        const lastReminder = sub.lastReminderAt;
        const hoursSinceLastReminder = lastReminder
          ? (now.getTime() - new Date(lastReminder).getTime()) / (1000 * 60 * 60)
          : 999;

        // Only send if we haven't sent a reminder in the last 18 hours for this threshold
        if (hoursSinceLastReminder < 18) continue;

        const urgency = daysUntilExpiry <= 1 ? "URGENT" : daysUntilExpiry <= 3 ? "IMPORTANT" : "REMINDER";
        const emoji = daysUntilExpiry <= 1 ? "🚨" : daysUntilExpiry <= 3 ? "⚠️" : "📅";

        const cycleLabel = isAnnual ? "annual" : "monthly";
        const priceLabel = isAnnual && sub.plan.annualPrice > 0
          ? `Rs. ${sub.plan.annualPrice.toLocaleString()}/year`
          : `Rs. ${sub.plan.price.toLocaleString()}/month`;

        await db.notification.create({
          data: {
            type: urgency === "URGENT" ? "error" : "warning",
            title: `${emoji} ${urgency}: Subscription Renewal — ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} remaining`,
            message: `Your ${sub.plan.name} plan (${cycleLabel} billing at ${priceLabel}) will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} on ${periodEnd.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}. Please submit your payment proof before the expiry date to avoid losing access to premium features. Your plan will automatically switch to Starter if payment is not received.`,
            orgId: sub.organization.id,
            actionUrl: "/billing",
          },
        });

        // Update reminder tracking
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            lastReminderAt: now,
            reminderCount: (sub.reminderCount || 0) + 1,
          },
        });

        results.reminders_sent++;
      }
    }

    // ── STEP 2: AUTO-EXPIRE SUBSCRIPTIONS ──
    const expiredSubscriptions = await db.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: { lt: now },
      },
      include: {
        organization: { select: { id: true, name: true, isBanned: true } },
        plan: true,
      },
    });

    const starterPlan = await db.subscriptionPlan.findUnique({
      where: { name: "starter" },
    });

    for (const sub of expiredSubscriptions) {
      if (sub.organization.isBanned) continue;

      // Check if there's a pending payment proof (give grace period)
      const pendingPayment = await db.paymentProof.findFirst({
        where: {
          subscriptionId: sub.id,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      });

      if (pendingPayment) {
        // Give 3 extra days grace period if payment is under review
        const graceDays = 3;
        const graceEnd = new Date(new Date(sub.currentPeriodEnd!).getTime() + graceDays * 24 * 60 * 60 * 1000);
        if (now < graceEnd) continue;
      }

      // Expire the subscription
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "expired",
          planId: starterPlan?.id || sub.planId,
          billingCycle: "monthly",
          lastReminderAt: null,
          reminderCount: 0,
        },
      });

      // Downgrade organization to starter
      await db.organization.update({
        where: { id: sub.organization.id },
        data: { plan: "starter" },
      });

      // Notify organization
      await db.notification.create({
        data: {
          type: "error",
          title: "Subscription Expired",
          message: `Your ${sub.plan.name} plan has expired and you have been automatically switched to the Starter plan. To reactivate your premium plan, please submit a new payment proof from the Billing page.`,
          orgId: sub.organization.id,
          actionUrl: "/billing",
        },
      });

      results.expired++;
      results.downgraded++;
    }

    // ── STEP 3: EXPIRE OLD TRIALS ──
    const expiredTrials = await db.subscription.findMany({
      where: {
        status: "trial",
        trialEndsAt: { lt: now },
      },
    });

    for (const sub of expiredTrials) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "expired" },
      });
      results.expired++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Subscription cron error:", error?.message || error);
    return NextResponse.json(
      { error: "Cron job failed", details: error?.message },
      { status: 500 }
    );
  }
}
