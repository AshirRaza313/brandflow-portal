import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/pdf-generator";
import { getCurrencyForCountry } from "@/lib/currency";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// POST /api/subscriptions/payment — Submit payment proof
// ALL operations wrapped in a Prisma transaction to prevent dual plan purchases
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Subscriptions Payment] POST request", { userId: authCtx.userId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { orgId, userId, planId, amount, transactionId, paymentMethod, screenshotUrl, billingCycle } = body;

    // ── INPUT VALIDATION ──
    if (!orgId || !userId || !planId || !amount || !transactionId || !paymentMethod) {
      return NextResponse.json(
        { error: "orgId, userId, planId, amount, transactionId, and paymentMethod are required" },
        { status: 400 }
      );
    }

    // Security: verify orgId and userId match auth context
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (userId !== authCtx.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate amount is a positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    // Validate transaction ID (alphanumeric + dashes, min 4 chars)
    if (!/^[\w\-]{4,50}$/.test(transactionId)) {
      return NextResponse.json({ error: "Invalid transaction ID format" }, { status: 400 });
    }

    // Validate payment method
    const validMethods = ["bank_transfer", "jazzcash", "easypaisa", "other"];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // Validate billing cycle
    const cycle = billingCycle || "monthly";
    if (!["monthly", "annually"].includes(cycle)) {
      return NextResponse.json({ error: "Invalid billing cycle. Must be 'monthly' or 'annually'" }, { status: 400 });
    }

    // ── PRE-TRANSACTION CHECKS (cheap reads) ──
    // These run BEFORE the transaction to avoid holding locks for validation

    // Check organization
    const organization = await db.organization.findUnique({ where: { id: orgId } });
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (organization.isBanned) {
      return NextResponse.json(
        { error: "Your organization has been banned. Contact support for assistance." },
        { status: 403 }
      );
    }

    // Check plan
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }
    if (!plan.isActive) {
      return NextResponse.json({ error: "This plan is no longer available" }, { status: 400 });
    }

    // Validate amount against plan price
    const expectedPrice = cycle === "annually" && plan.annualPrice > 0 ? plan.annualPrice : plan.price;
    const tolerance = 0.05; // Allow 5% tolerance for bank fees etc.
    const minAmount = expectedPrice * (1 - tolerance);
    const maxAmount = expectedPrice * (1 + tolerance);

    if (plan.price > 0 && (parsedAmount < minAmount || parsedAmount > maxAmount)) {
      return NextResponse.json(
        { error: `Amount does not match the plan price. Expected: Rs. ${expectedPrice.toLocaleString()} (${cycle}), you entered: Rs. ${parsedAmount.toLocaleString()}` },
        { status: 400 }
      );
    }

    // ── SERVER-SIDE SCREENSHOT SIZE VALIDATION ──
    let validatedScreenshot = screenshotUrl || null;
    if (validatedScreenshot && validatedScreenshot.startsWith("data:image")) {
      const base64Length = validatedScreenshot.length - (validatedScreenshot.indexOf(",") + 1);
      const estimatedBytes = (base64Length * 3) / 4;
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (estimatedBytes > maxSize) {
        return NextResponse.json(
          { error: "Screenshot must be less than 5MB. Please compress and try again." },
          { status: 400 }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    // TRANSACTION: Atomic payment proof submission
    // Prevents dual concurrent plan purchases via TOCTOU protection
    // ══════════════════════════════════════════════════════════════
    const result = await db.$transaction(async (tx) => {
      // 1. Get or create subscription (within transaction for atomicity)
      let subscription = await tx.subscription.findUnique({
        where: { organizationId: orgId },
      });

      if (!subscription) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
        subscription = await tx.subscription.create({
          data: {
            organizationId: orgId,
            planId: plan.id,
            status: "trial",
            billingCycle: cycle,
            trialStartsAt: now,
            trialEndsAt: trialEnd,
          },
        });
      }

      // ── CHECK 1: Prevent if already active on this exact plan ──
      if (subscription.planId === plan.id && subscription.status === "active") {
        throw new Error("ALREADY_ON_PLAN: You are already on this plan. Choose a different plan to upgrade or change.");
      }

      // ── CHECK 2: Prevent duplicate pending payment proof for this plan ──
      const existingPendingPayment = await tx.paymentProof.findFirst({
        where: {
          subscriptionId: subscription.id,
          planName: plan.name,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingPendingPayment) {
        throw new Error("PENDING_PAYMENT_EXISTS: You already have a pending payment proof for this plan. Please wait for admin review.");
      }

      // ── CHECK 3: Prevent if subscription is already pending_payment for ANY plan ──
      if (subscription.status === "pending_payment") {
        throw new Error("SUBSCRIPTION_PENDING: A payment is already under review. Please wait for admin to approve or reject it.");
      }

      // ── CHECK 4: Prevent duplicate transaction ID ──
      const duplicateTxn = await tx.paymentProof.findFirst({
        where: { transactionId },
        orderBy: { createdAt: "desc" },
      });
      if (duplicateTxn) {
        throw new Error("DUPLICATE_TXN: This transaction ID has already been used.");
      }

      // ── CHECK 5: Prevent downgrade ──
      const currentPlan = await tx.subscriptionPlan.findUnique({ where: { id: subscription.planId } });
      if (currentPlan && plan.price < currentPlan.price && subscription.status === "active") {
        throw new Error("DOWNGRADE_NOT_ALLOWED: Downgrading is not supported. Please contact admin.");
      }

      // ── CHECK 6: Only one active plan at a time ──
      if (subscription.status === "active" && currentPlan && currentPlan.price > 0) {
        throw new Error("ALREADY_ACTIVE_PLAN: You already have an active paid plan. Contact admin to switch.");
      }

      // ── CREATE PAYMENT PROOF ──
      const paymentProof = await tx.paymentProof.create({
        data: {
          subscriptionId: subscription.id,
          organizationId: orgId,
          planId: plan.id,
          planName: plan.name,
          amount: parsedAmount,
          billingCycle: cycle,
          transactionId,
          paymentMethod,
          screenshotUrl: validatedScreenshot,
        },
      });

      // ── UPDATE SUBSCRIPTION STATUS ──
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: "pending_payment" },
      });

      // ── AUTO-GENERATE INVOICE ──
      const country = organization.country || "PK";
      const currency = getCurrencyForCountry(country);

      const invoiceCount = await tx.invoice.count({
        where: { organizationId: orgId },
      });
      const invoiceNumber = generateInvoiceNumber(invoiceCount);
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          organizationId: orgId,
          subscriptionId: subscription.id,
          paymentProofId: paymentProof.id,
          planName: plan.name,
          amount: parsedAmount,
          billingCycle: cycle,
          status: "pending",
          currencyCode: currency.code,
          currencySymbol: currency.symbol,
          dueDate,
          orgName: organization.name,
          orgEmail: organization.email || null,
          orgPhone: organization.phone || null,
          orgAddress: organization.address || null,
          notes: "Auto-generated invoice. Payment proof under review.",
        },
      });

      // ── CREATE NOTIFICATION ──
      await tx.notification.create({
        data: {
          type: "payment_submitted",
          title: "New Payment Proof Submitted",
          message: `Payment proof of ${currency.symbol} ${parsedAmount.toLocaleString()} for ${plan.name} plan (${cycle} billing) submitted by ${organization.name}. Invoice: ${invoiceNumber}.`,
          orgId: orgId,
        },
      });

      return { paymentProof, invoice, invoiceNumber, subscription };
    });

    // ── RETURN SUCCESS ──
    const country = organization.country || "PK";
    const currency = getCurrencyForCountry(country);

    return NextResponse.json({
      success: true,
      payment: {
        id: result.paymentProof.id,
        planName: result.paymentProof.planName,
        amount: result.paymentProof.amount,
        transactionId: result.paymentProof.transactionId,
        paymentMethod: result.paymentProof.paymentMethod,
        billingCycle: result.paymentProof.billingCycle,
        status: result.paymentProof.status,
        createdAt: result.paymentProof.createdAt,
      },
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoiceNumber,
      },
      message: `Payment proof submitted for ${plan.name} plan (${cycle} billing). Invoice ${result.invoiceNumber} generated. We will review it within 24 hours.`,
    });
  } catch (error: any) {
    console.error("Submit payment error:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });

    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }

    // Handle transaction-thrown business logic errors
    if (error?.message?.startsWith("ALREADY_ON_PLAN:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 400 });
    }
    if (error?.message?.startsWith("PENDING_PAYMENT_EXISTS:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 400 });
    }
    if (error?.message?.startsWith("SUBSCRIPTION_PENDING:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 400 });
    }
    if (error?.message?.startsWith("DUPLICATE_TXN:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 409 });
    }
    if (error?.message?.startsWith("DOWNGRADE_NOT_ALLOWED:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 400 });
    }
    if (error?.message?.startsWith("ALREADY_ACTIVE_PLAN:")) {
      return NextResponse.json({ error: error.message.split(": ")[1] }, { status: 400 });
    }

    // Prisma unique constraint violation (additional safety for transactionId)
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate entry detected. This transaction ID may already exist." }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to submit payment proof. Please try again." }, { status: 500 });
  }
});
