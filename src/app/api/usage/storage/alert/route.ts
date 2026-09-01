// ============================================================================
// Storage Alert API
// ============================================================================
// POST /api/usage/storage/alert
//
// Checks if storage usage has crossed a new threshold since the last alert.
// If so, creates a Notification record (type "storage_warning" or "storage_critical").
// Protected via withAuth middleware.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { shouldSendStorageAlert, checkStorageLimit } from "@/lib/storage-tracker";
import { db, withRetry} from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const orgId = authCtx.organizationId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }


    // Verify org exists
    const org = await withRetry(async () => {
      return await db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    })
    }, 2, 500);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const plan = org.plan || "starter";

    // Check if we should send an alert (crossed a new 25% threshold)
    const shouldAlert = await shouldSendStorageAlert(orgId);

    if (!shouldAlert.shouldSend) {
      return NextResponse.json({
        alerted: false,
        message: "No new storage threshold crossed since last alert.",
      });
    }

    // Get current storage details for the notification
    const result = await checkStorageLimit(orgId, plan);

    const isCritical = result.warning === "critical";
    const notificationType = isCritical ? "storage_critical" : "storage_warning";

    const usedMbRounded = Math.round(result.usedMb * 100) / 100;
    const limitGb = result.limitMb === -1 ? "Unlimited" : `${(result.limitMb / 1024).toFixed(1)} GB`;
    const percentStr = `${result.percent}%`;

    const title = isCritical
      ? `⚠️ Critical: Storage at ${percentStr}`
      : `⚡ Storage Warning: ${percentStr} used`;

    const message = isCritical
      ? `Your organization has used ${usedMbRounded} MB out of ${limitGb} storage (${percentStr}). Please free up space or upgrade your plan immediately to avoid service disruption.`
      : `Your organization has used ${usedMbRounded} MB out of ${limitGb} storage (${percentStr}). Consider upgrading your plan to get more storage.`;

    // Create notification for all org members
    await withRetry(async () => {
      return await db.notification.create({
      data: {
        type: notificationType,
        title,
        message,
        orgId,
        actionUrl: "/billing",
        icon: isCritical ? "AlertTriangle" : "HardDrive",
      },
    })
    }, 2, 500);

    return NextResponse.json({
      alerted: true,
      message: `Storage alert sent: ${percentStr} of ${limitGb} used.`,
    });
  } catch (error: unknown) {
    logger.error("[Storage Alert] Error:", error);
    return NextResponse.json(
      { error: "Failed to check storage alert" },
      { status: 500 }
    );
  }
}, { requireOrg: true }), { maxRequests: 30, windowSeconds: 60 });
