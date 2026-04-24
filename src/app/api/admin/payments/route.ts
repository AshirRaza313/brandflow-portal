import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/payments — List all payment proofs (for admin dashboard)
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Payments] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const payments = await db.paymentProof.findMany({
      where,
      include: {
        subscription: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                phone: true,
                logo: true,
                plan: true,
                isBanned: true,
                paymentRejectionCount: true,
              },
            },
            plan: {
              select: { name: true, price: true, annualPrice: true, period: true },
            },
          },
        },
        organization: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Stats
    const allPayments = await db.paymentProof.findMany({ select: { status: true } });
    const stats = {
      total: allPayments.length,
      pending: allPayments.filter((p) => p.status === "pending").length,
      approved: allPayments.filter((p) => p.status === "approved").length,
      rejected: allPayments.filter((p) => p.status === "rejected").length,
    };

    const formatted = payments.map((p) => ({
      id: p.id,
      planName: p.planName,
      planId: p.planId,
      amount: p.amount,
      billingCycle: p.billingCycle || "monthly",
      transactionId: p.transactionId,
      paymentMethod: p.paymentMethod,
      screenshotUrl: p.screenshotUrl,
      status: p.status,
      adminNote: p.adminNote,
      reviewedBy: p.reviewedBy,
      reviewedAt: p.reviewedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      organization: p.subscription?.organization || p.organization || null,
      subscriptionPlan: p.subscription?.plan || null,
    }));

    return NextResponse.json({ payments: formatted, stats });
  } catch (error: any) {
    console.error("Admin payments error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
