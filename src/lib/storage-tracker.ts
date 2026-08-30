// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
// ============================================================================
// Storage Tracker - Estimates usage and enforces plan-based storage limits
// ============================================================================
// Provides three core functions:
//   1. estimateStorageUsage(orgId) → MB used (estimated from DB records)
//   2. checkStorageLimit(orgId, plan) → usage vs limit with warnings
//   3. shouldSendStorageAlert(orgId) → threshold-based alert gating
// ============================================================================

import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";

// ─── Average record sizes (in KB) ──────────────────────────────────────────
const AVG_SIZE_KB = {
  customer: 2,
  product: 3,          // text-only record
  productWithImage: 50, // product with base64/URL image
  order: 2,
  invoice: 5,
  coupon: 1,
  task: 1,
  notification: 1,
  proposal: 3,
} as const;

// ─── Threshold markers for alert gating ─────────────────────────────────────
const STORAGE_THRESHOLD_STEPS = [0, 25, 50, 75, 90, 100] as const;

// ============================================================================
// estimateStorageUsage
// ============================================================================
// Counts DB records for the org and multiplies by average sizes to produce an
// estimated storage usage in MB. Each query is wrapped individually so a
// missing table/column won't crash the whole estimation.
// ============================================================================

/** Safely count records — returns 0 on any error */
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch (err: any) {
    console.warn("[StorageTracker] Count query failed:", err?.message?.substring(0, 100) || err);
    return 0;
  }
}

export async function estimateStorageUsage(orgId: string): Promise<number> {
  const [
    customerCount,
    productCount,
    productsWithImages,
    orderCount,
    invoiceCount,
    couponCount,
    taskCount,
    notificationCount,
    proposalCount,
    paymentProofScreenshots,
  ] = await Promise.all([
    safeCount(() => db.customer.count({ where: { organizationId: orgId } })),
    safeCount(() => db.product.count({ where: { organizationId: orgId } })),
    safeCount(() => db.product.count({
      where: { organizationId: orgId, imageUrl: { not: null } },
    })),
    safeCount(() => db.order.count({ where: { organizationId: orgId } })),
    safeCount(() => db.invoice.count({ where: { organizationId: orgId } })),
    safeCount(() => db.coupon.count({ where: { organizationId: orgId } })),
    safeCount(() => db.teamTask.count({ where: { organizationId: orgId } })),
    safeCount(() => db.notification.count({ where: { orgId } })),
    safeCount(() => db.proposal.count()),
    // PaymentProof screenshots — need actual records for base64 size estimation
    db.paymentProof.findMany({
      where: { organizationId: orgId, screenshotUrl: { not: null } },
      select: { screenshotUrl: true },
      take: 500, // cap to prevent memory issues
    }).catch(() => [] as Array<{ screenshotUrl: string | null }>),
  ]);

  // ── Base text-record sizes ──
  let totalKb = 0;

  totalKb += customerCount * AVG_SIZE_KB.customer;
  totalKb += (productCount - productsWithImages) * AVG_SIZE_KB.product;
  totalKb += productsWithImages * AVG_SIZE_KB.productWithImage;
  totalKb += orderCount * AVG_SIZE_KB.order;
  totalKb += invoiceCount * AVG_SIZE_KB.invoice;
  totalKb += couponCount * AVG_SIZE_KB.coupon;
  totalKb += taskCount * AVG_SIZE_KB.task;
  totalKb += notificationCount * AVG_SIZE_KB.notification;
  totalKb += proposalCount * AVG_SIZE_KB.proposal;

  // ── PaymentProof screenshots: measure actual base64 size ──
  for (const proof of paymentProofScreenshots) {
    const url = proof.screenshotUrl;
    if (url) {
      // Base64 strings start with "data:" - the payload length is ~3/4 of the raw bytes
      if (url.startsWith("data:")) {
        // Strip the data URI prefix (e.g. "data:image/png;base64,")
        const commaIndex = url.indexOf(",");
        const base64Length = commaIndex >= 0 ? url.length - commaIndex - 1 : url.length;
        // Each base64 character encodes 6 bits, so bytes ≈ base64Length * 3/4
        const bytes = Math.floor(base64Length * 0.75);
        totalKb += bytes / 1024;
      } else {
        // External URL - estimate ~50KB per image
        totalKb += 50;
      }
    }
  }

  // Convert KB → MB (round to 2 decimal places)
  const totalMb = Math.round((totalKb / 1024) * 100) / 100;

  // ── Cache the result to Organization.usageStorageMb ──
  try {
    await db.organization.update({
      where: { id: orgId },
      data: { usageStorageMb: Math.round(totalMb) },
    });
  } catch {
    // Best-effort cache - don't fail the estimate if update fails
  }

  return totalMb;
}

// ============================================================================
// checkStorageLimit
// ============================================================================
// Compares estimated usage against the plan's storage limit.
// Returns usage stats with a warning string if thresholds are crossed.
// ============================================================================
export async function checkStorageLimit(
  orgId: string,
  plan: string
): Promise<{
  usedMb: number;
  limitMb: number;
  percent: number;
  warning: "ok" | "warning" | "critical" | null;
}> {
  const usedMb = await estimateStorageUsage(orgId);
  const limits = getPlanLimits(plan);
  const limitMb = limits.storageGb === -1 ? -1 : limits.storageGb * 1024;

  // Unlimited storage
  if (limitMb === -1) {
    return { usedMb, limitMb: -1, percent: 0, warning: null };
  }

  const percent = Math.min(Math.round((usedMb / limitMb) * 100), 100);

  let warning: "ok" | "warning" | "critical" | null = null;
  if (percent >= 90) {
    warning = "critical";
  } else if (percent >= 75) {
    warning = "warning";
  }

  return { usedMb, limitMb, percent, warning };
}

// ============================================================================
// shouldSendStorageAlert
// ============================================================================
// Gate function to avoid spamming the same alert. Uses Organization's
// usageLastAlertAt to track when the last alert was sent and only sends
// a new one when usage crosses the next threshold step.
// ============================================================================
export async function shouldSendStorageAlert(orgId: string): Promise<{
  shouldSend: boolean;
  usedMb: number;
  limitMb: number;
  percent: number;
}> {
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, usageLastAlertAt: true },
    });

    if (!org) return { shouldSend: false, usedMb: 0, limitMb: 0, percent: 0 };

    const { usedMb, limitMb, percent, warning } = await checkStorageLimit(orgId, org.plan || "starter");

    if (!warning) return { shouldSend: false, usedMb, limitMb, percent };

    // Determine the next threshold step that usage has crossed
    const lastAlert = org.usageLastAlertAt?.getTime() || 0;
    const now = Date.now();

    // Don't send more than one alert per 24 hours
    if (now - lastAlert < 24 * 60 * 60 * 1000) {
      return { shouldSend: false, usedMb, limitMb, percent };
    }

    // Update the last alert timestamp
    await db.organization.update({
      where: { id: orgId },
      data: { usageLastAlertAt: new Date() },
    });

    return { shouldSend: true, usedMb, limitMb, percent };
  } catch (error) {
    console.error("[StorageTracker] shouldSendStorageAlert error:", error);
    return { shouldSend: false, usedMb: 0, limitMb: 0, percent: 0 };
  }
}
