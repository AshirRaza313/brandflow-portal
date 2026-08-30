import crypto from "crypto";
import { NextResponse } from "next/server";
import { db, withRetry} from "@/lib/db";
import logger from "@/lib/logger";

// GET /api/cron/subscriptions - Cron job for subscription management
// Called by Vercel Cron daily
// Handles:
//   1. Send renewal reminders (7 days before, 3 days before, 1 day before)
//   2. For annual plans: 7 days and 3 days before year ends
//   3. Auto-expire subscriptions that have passed their period end
//   4. Auto-downgrade expired subscriptions to starter plan
export async function GET(req: Request) {
  try {
    // ── CRON AUTH (Vercel Cron header) ──
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    // FIX 1.6: Use timingSafeEqual to prevent timing attacks on cron secret
    const authHeader = req.headers.get("authorization");
    const expectedHeader = `Bearer ${cronSecret}`;
    const providedHeader = authHeader || "";
    const isValid =
      providedHeader.length === expectedHeader.length &&
      crypto.timingSafeEqual(
        Buffer.from(providedHeader, "utf8"),
        Buffer.from(expectedHeader, "utf8")
      );
    if (!authHeader || !isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const now = new Date();
    const results = {
      reminders_sent: 0,
      expired: 0,
      downgraded: 0,
      errors: [] as string[],
    };

    // ── STEP 1: SEND RENEWAL REMINDERS ──
    const activeSubscriptions = await withRetry(async () => {
      return await db.subscription.findMany({
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
    })
    }, 2, 500);

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
        const priceLabel = isAnnual && Number(sub.plan.annualPrice) > 0
          ? `Rs. ${Number(sub.plan.annualPrice).toLocaleString()}/year`
          : `Rs. ${Number(sub.plan.price).toLocaleString()}/month`;

        await withRetry(async () => {
          return await db.notification.create({
          data: {
            type: urgency === "URGENT" ? "error" : "warning",
            title: `${emoji} ${urgency}: Subscription Renewal - ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} remaining`,
            message: `Your ${sub.plan.name} plan (${cycleLabel} billing at ${priceLabel}) will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} on ${periodEnd.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}. Please submit your payment proof before the expiry date to avoid losing access to premium features. Your plan will automatically switch to Starter if payment is not received.`,
            orgId: sub.organization.id,
            actionUrl: "/billing",
          },
        })
        }, 2, 500);

        // Update reminder tracking
        await withRetry(async () => {
          return await db.subscription.update({
          where: { id: sub.id },
          data: {
            lastReminderAt: now,
            reminderCount: (sub.reminderCount || 0) + 1,
          },
        })
        }, 2, 500);

        results.reminders_sent++;
      }
    }

    // ── STEP 2: AUTO-EXPIRE SUBSCRIPTIONS ──
    const expiredSubscriptions = await withRetry(async () => {
      return await db.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: { lt: now },
      },
      include: {
        organization: { select: { id: true, name: true, isBanned: true } },
        plan: true,
      },
    })
    }, 2, 500);

    const starterPlan = await withRetry(async () => {
      return await db.subscriptionPlan.findUnique({
      where: { name: "starter" },
    })
    }, 2, 500);

    for (const sub of expiredSubscriptions) {
      if (sub.organization.isBanned) continue;

      // Check if there's a pending payment proof (give grace period)
      const pendingPayment = await withRetry(async () => {
        return await db.paymentProof.findFirst({
        where: {
          subscriptionId: sub.id,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      })
      }, 2, 500);

      if (pendingPayment) {
        // Give 3 extra days grace period if payment is under review
        const graceDays = 3;
        const graceEnd = new Date(new Date(sub.currentPeriodEnd!).getTime() + graceDays * 24 * 60 * 60 * 1000);
        if (now < graceEnd) continue;
      }

      // Expire the subscription
      await withRetry(async () => {
        return await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "expired",
          planId: starterPlan?.id || sub.planId,
          billingCycle: "monthly",
          lastReminderAt: null,
          reminderCount: 0,
        },
      })
      }, 2, 500);

      // Downgrade organization to starter
      await withRetry(async () => {
        return await db.organization.update({
        where: { id: sub.organization.id },
        data: { plan: "starter" },
      })
      }, 2, 500);

      // Notify organization
      await withRetry(async () => {
        return await db.notification.create({
        data: {
          type: "error",
          title: "Subscription Expired",
          message: `Your ${sub.plan.name} plan has expired and you have been automatically switched to the Starter plan. To reactivate your premium plan, please submit a new payment proof from the Billing page.`,
          orgId: sub.organization.id,
          actionUrl: "/billing",
        },
      })
      }, 2, 500);

      results.expired++;
      results.downgraded++;
    }

    // ── SKIP UNLIMITED ROLE ORGS (founder/team/admin) ──
    const UNLIMITED_ROLES = ["platform_owner", "platform_admin", "valtriox_team"];
    const unlimitedOrgIds = new Set(
      (await db.organizationMember.findMany({
        where: { role: { in: UNLIMITED_ROLES } },
        select: { organizationId: true },
      })).map((m) => m.organizationId)
    );

    // ── STEP 3: EXPIRE OLD TRIALS ──
    const expiredTrials = await withRetry(async () => {
      return await db.subscription.findMany({
      where: {
        status: "trial",
        trialEndsAt: { lt: now },
      },
      include: {
        organization: {
          select: { id: true, name: true, isBanned: true },
        },
      },
    })
    }, 2, 500);

    for (const sub of expiredTrials) {
      if (sub.organization.isBanned) continue;
      if (unlimitedOrgIds.has(sub.organization.id)) continue;

      // Set subscription status to expired (keep record for history)
      await withRetry(async () => {
        return await db.subscription.update({
        where: { id: sub.id },
        data: { status: "expired" },
      })
      }, 2, 500);

      // Downgrade organization plan to starter
      await withRetry(async () => {
        return await db.organization.update({
        where: { id: sub.organization.id },
        data: { plan: "starter" },
      })
      }, 2, 500);

      // Notify organization about trial expiry
      await withRetry(async () => {
        return await db.notification.create({
        data: {
          type: "warning",
          title: "Free Trial Expired",
          message: `Your 14-day free trial has expired and your account has been switched to the Starter plan. Upgrade now to keep using premium features like campaigns, SEO, marketing tools, and more.`,
          orgId: sub.organization.id,
          actionUrl: "/billing",
        },
      })
      }, 2, 500);

      results.expired++;
      results.downgraded++;
    }

    // ── STEP 4: TRIAL EXPIRY REMINDERS ──
    const activeTrials = await withRetry(async () => {
      return await db.subscription.findMany({
      where: {
        status: "trial",
        trialEndsAt: { gt: now },
      },
      include: {
        organization: {
          select: { id: true, name: true, isBanned: true },
        },
      },
    })
    }, 2, 500);

    for (const sub of activeTrials) {
      if (sub.organization.isBanned) continue;
      if (unlimitedOrgIds.has(sub.organization.id)) continue;

      const trialEnd = new Date(sub.trialEndsAt);
      const daysUntilExpiry = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders at 7 days, 3 days, and 1 day before trial expires
      if ([7, 3, 1].includes(daysUntilExpiry)) {
        // Don't send duplicate reminders
        const lastReminder = sub.lastReminderAt;
        const hoursSinceLastReminder = lastReminder
          ? (now.getTime() - new Date(lastReminder).getTime()) / (1000 * 60 * 60)
          : 999;
        if (hoursSinceLastReminder < 18) continue;

        const urgency = daysUntilExpiry <= 1 ? "URGENT" : daysUntilExpiry <= 3 ? "IMPORTANT" : "REMINDER";
        const emoji = daysUntilExpiry <= 1 ? "🚨" : daysUntilExpiry <= 3 ? "⚠️" : "📅";

        await withRetry(async () => {
          return await db.notification.create({
          data: {
            type: urgency === "URGENT" ? "error" : "warning",
            title: `${emoji} ${urgency}: Trial Expiring - ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} remaining`,
            message: `Your free trial expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} on ${trialEnd.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}. Upgrade to a paid plan to keep all premium features. Your account will automatically switch to the Starter plan after the trial ends.`,
            orgId: sub.organization.id,
            actionUrl: "/billing",
          },
        })
        }, 2, 500);

        // Update reminder tracking
        await withRetry(async () => {
          return await db.subscription.update({
          where: { id: sub.id },
          data: {
            lastReminderAt: now,
            reminderCount: (sub.reminderCount || 0) + 1,
          },
        })
        }, 2, 500);

        results.reminders_sent++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: unknown) {
    logger.error("Subscription cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", details: undefined },
      { status: 500 }
    );
  }
}
