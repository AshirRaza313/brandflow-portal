import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// PUT /api/admin/payments/[id] — Approve or reject a payment proof
// ALL operations wrapped in a Prisma transaction for atomicity.
// If any step fails, everything rolls back — no partial state corruption.
export const PUT = withAuth(async (
  req: NextRequest,
  authCtx,
  { params }: { params: Promise<{ id: string }> }
) => {
  logger.info("[Admin Payments] PUT request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const { id } = await params;
    const body = await req.json();
    const { status, adminNote } = body;

    // ── VALIDATION ──
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    // ── FIND PAYMENT PROOF ──
    const payment = await db.paymentProof.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: `Payment already ${payment.status}` }, { status: 400 });
    }

    // ── FIND SUBSCRIPTION (separate query for safety) ──
    const subscription = await db.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Associated subscription not found" }, { status: 404 });
    }

    // ── FIND ORGANIZATION ──
    const organization = await db.organization.findUnique({
      where: { id: payment.organizationId },
    });

    if (!organization) {
      return NextResponse.json({ error: "Associated organization not found" }, { status: 404 });
    }

    // Check if organization is banned (reject only)
    if (organization.isBanned && status === "approved") {
      return NextResponse.json(
        { error: "This organization is banned. Cannot approve payment." },
        { status: 403 }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // TRANSACTION: All-or-nothing payment review
    // If ANY operation fails, ALL changes are rolled back.
    // ══════════════════════════════════════════════════════════════
    const result = await db.$transaction(async (tx) => {
      // 1. Update payment proof status
      const updatedPayment = await tx.paymentProof.update({
        where: { id },
        data: {
          status,
          adminNote: adminNote || null,
          reviewedBy: authCtx.userId,
          reviewedAt: new Date(),
        },
      });

      if (status === "approved") {
        // 2. Find target plan — FAIL if plan doesn't exist
        const targetPlan = payment.planId
          ? await tx.subscriptionPlan.findUnique({ where: { id: payment.planId } })
          : await tx.subscriptionPlan.findUnique({ where: { name: payment.planName } });

        if (!targetPlan) {
          throw new Error(
            `TARGET_PLAN_NOT_FOUND: Plan "${payment.planName}" (ID: ${payment.planId}) not found. It may have been deleted or renamed.`
          );
        }

        // 3. Calculate period end based on billing cycle
        const billingCycle = payment.billingCycle || subscription.billingCycle || "monthly";
        const periodDays = billingCycle === "annually" ? 365 : 30;
        const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

        // 4. Update subscription to active
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "active",
            planId: targetPlan.id,
            billingCycle,
            currentPeriodEnd,
            lastReminderAt: null,
            reminderCount: 0,
          },
        });

        // 5. Update organization — SINGLE atomic update (plan + active + rejection reset)
        await tx.organization.update({
          where: { id: payment.organizationId },
          data: {
            plan: targetPlan.name,
            isActive: true,
            paymentRejectionCount: 0,
          },
        });

        // 6. Create notification for the organization
        await tx.notification.create({
          data: {
            type: "payment_approved",
            title: "Payment Approved!",
            message: `Your payment of Rs. ${payment.amount.toLocaleString()} for the ${payment.planName} plan (${billingCycle} billing) has been approved. Your subscription is now active!`,
            orgId: payment.organizationId,
            actionUrl: "/billing",
          },
        });

        // 7. Find related invoice (DO NOT auto-update status — admin handles manually)
        const relatedInvoice = await tx.invoice.findFirst({
          where: { paymentProofId: payment.id },
        });
        // NOTE: Invoice status is intentionally NOT updated to "paid" here.
        // Admin must manually approve/mark the invoice from Invoice Management.

        return {
          updatedPayment,
          targetPlanName: targetPlan.name,
          billingCycle,
        };
      }

      if (status === "rejected") {
        // ── REJECTION FLOW ──
        const newRejectionCount = (organization.paymentRejectionCount || 0) + 1;
        const banThreshold = 3;
        const isBanned = newRejectionCount >= banThreshold;

        // Build warning message
        let warningMessage = "";
        if (newRejectionCount === 1) {
          warningMessage = "WARNING: This is your first rejected payment. Please ensure your payment proof is genuine and matches the required amount. Submitting fake or invalid payment proofs may result in account suspension or permanent ban.";
        } else if (newRejectionCount === 2) {
          warningMessage = "FINAL WARNING: You have submitted 2 rejected payment proofs. If you submit another fake or invalid payment proof, your account will be PERMANENTLY BANNED and legal action may be taken. Please ensure your payment is genuine before submitting.";
        } else {
          warningMessage = "ACCOUNT BANNED: Your account has been permanently banned due to repeated submission of fake or invalid payment proofs. All your data will be preserved but access is revoked. If you believe this is an error, contact support immediately.";
        }

        // Revert subscription status
        if (subscription.status === "pending_payment") {
          const now = new Date();
          const trialEnd = new Date(subscription.trialEndsAt);
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: trialEnd > now ? "trial" : "expired",
            },
          });
        }

        // SINGLE atomic organization update — rejection count + ban status
        await tx.organization.update({
          where: { id: payment.organizationId },
          data: {
            paymentRejectionCount: newRejectionCount,
            isBanned,
            banReason: isBanned ? "Permanent ban: Repeated fake/invalid payment proof submissions" : null,
            bannedAt: isBanned ? new Date() : null,
            isActive: isBanned ? false : organization.isActive,
          },
        });

        // Create rejection notification for the organization
        await tx.notification.create({
          data: {
            type: "payment_rejected",
            title: isBanned ? "Account Banned" : "Payment Rejected",
            message: `Your payment of Rs. ${payment.amount.toLocaleString()} for the ${payment.planName} plan was rejected.${adminNote ? ` Reason: ${adminNote}` : ""} ${warningMessage}`,
            orgId: payment.organizationId,
          },
        });

        // Create admin notification about the rejection
        await tx.notification.create({
          data: {
            type: "warning",
            title: isBanned ? "Organization Banned" : "Payment Rejected",
            message: `Payment for "${organization.name}" was rejected (rejection count: ${newRejectionCount}/${banThreshold}).${isBanned ? " Organization has been BANNED." : ""}`,
            userId: authCtx.userId,
          },
        });

        return {
          updatedPayment,
          newRejectionCount,
          banThreshold,
          isBanned,
          warningMessage,
        };
      }

      // Should never reach here
      throw new Error("Unexpected status value");
    });

    // ── RETURN SUCCESS ──
    if (status === "approved") {
      const approvalResult = result as { updatedPayment: any; targetPlanName: string; billingCycle: string };
      return NextResponse.json({
        success: true,
        payment: {
          id: approvalResult.updatedPayment.id,
          status: approvalResult.updatedPayment.status,
          adminNote: approvalResult.updatedPayment.adminNote,
          reviewedAt: approvalResult.updatedPayment.reviewedAt,
        },
        message: `Payment approved successfully. ${approvalResult.targetPlanName} plan activated (${approvalResult.billingCycle} billing).`,
      });
    }

    if (status === "rejected") {
      const rejectionResult = result as {
        updatedPayment: any;
        newRejectionCount: number;
        banThreshold: number;
        isBanned: boolean;
        warningMessage: string;
      };
      return NextResponse.json({
        success: true,
        payment: {
          id: rejectionResult.updatedPayment.id,
          status: rejectionResult.updatedPayment.status,
          adminNote: rejectionResult.updatedPayment.adminNote,
          reviewedAt: rejectionResult.updatedPayment.reviewedAt,
        },
        message: `Payment rejected. ${rejectionResult.isBanned ? "Organization has been BANNED due to repeated fake payments." : `Warning issued (rejection count: ${rejectionResult.newRejectionCount}/${rejectionResult.banThreshold}).`}`,
        warning: rejectionResult.warningMessage,
        isBanned: rejectionResult.isBanned,
      });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  } catch (error: any) {
    console.error("Admin payment review error:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }

    // Specific error: plan not found — give actionable message
    if (error?.message?.includes("TARGET_PLAN_NOT_FOUND")) {
      return NextResponse.json({
        error: "Cannot approve payment: the selected plan no longer exists or has been renamed. Please contact support or ask the organization to select a different plan.",
        details: error.message,
      }, { status: 400 });
    }

    // Return specific error message based on Prisma error code
    const prismaError = error?.code;
    if (prismaError === "P2025") {
      return NextResponse.json({ error: "Referenced record not found. The subscription, organization, or plan may have been deleted." }, { status: 404 });
    }
    if (prismaError === "P2002") {
      return NextResponse.json({ error: "A duplicate record conflict occurred. Please try again." }, { status: 409 });
    }
    if (prismaError === "P2003") {
      return NextResponse.json({ error: "Foreign key constraint failed. Referenced record may not exist." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to review payment. Please try again or contact support if the issue persists." }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
