import { NextRequest, NextResponse } from "next/server";
import { db, isDbUnavailable, dbErrorResponse, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { isUnlimitedRole } from "@/lib/plan-limits";

// POST /api/db-notifications/mark-all-read?orgId=xxx
// Marks ALL unread notifications for the CURRENT USER as read, respecting audience.
// Targeted rows (userId set) get read=true.
// Org-wide rows (userId=null) get a per-user read receipt (NotificationReadReceipt).
export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId || authCtx.organizationId !== orgId) {
      return NextResponse.json({ error: "Invalid orgId" }, { status: 400 });
    }

    const hiddenTypes = isUnlimitedRole(authCtx.role)
      ? ["storage_warning", "storage_critical", "subscription_renewal", "subscription_expired", "trial_expired", "trial_expiring"]
      : [];

    // 1. Targeted notifications (userId = current user)
    const targetedWhere: any = {
      orgId,
      userId: authCtx.userId,
      read: false,
    };
    if (hiddenTypes.length > 0) targetedWhere.NOT = { type: { in: hiddenTypes } };

    // 2. Org-wide notifications (userId = null) that this user hasn't read yet
    const orgWideWhere: any = {
      orgId,
      userId: null,
      readReceipts: { none: { userId: authCtx.userId } },
    };
    if (hiddenTypes.length > 0) orgWideWhere.NOT = { type: { in: hiddenTypes } };

    const result = await withRetry(async () => {
      return await db.$transaction(async (tx) => {
        const targetedUpdate = await tx.notification.updateMany({
          where: targetedWhere,
          data: { read: true },
        });

        const orgWideIds = await tx.notification.findMany({
          where: orgWideWhere,
          select: { id: true },
        });

        let receiptCreated = 0;
        if (orgWideIds.length > 0) {
          const createResult = await tx.notificationReadReceipt.createMany({
            data: orgWideIds.map(n => ({ notificationId: n.id, userId: authCtx.userId })),
            skipDuplicates: true,
          });
          receiptCreated = createResult.count;
        }

        return {
          updatedCount: targetedUpdate.count + receiptCreated,
        };
      });
    }, 2, 500);

    logger.info("[Notifications] Mark-all-read", { userId: authCtx.userId, orgId, updatedCount: result.updatedCount });

    return NextResponse.json({ updatedCount: result.updatedCount });
  } catch (error: unknown) {
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    logger.error("[Notifications] mark-all-read failed", { error });
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}));
