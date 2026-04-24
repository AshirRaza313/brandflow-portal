import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

const prisma = new PrismaClient();

// GET /api/admin/plans — List all plans with their pricing (platform owner only)
export const GET = withAuth(async (_request: NextRequest, authCtx) => {
  logger.info("[Admin Plans] GET request", { userId: authCtx.userId });
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Fetch plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

// PUT /api/admin/plans — Update plan pricing (platform owner only)
export const PUT = withAuth(async (request: NextRequest, authCtx) => {
  logger.info("[Admin Plans] PUT request", { userId: authCtx.userId });
  try {
    const body = await request.json();
    const { planId, price, period, teamLimit, orderLimit, productLimit, trialDays, features } = body;

    if (!planId || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updateData: any = { price: Number(price) };
    if (period) updateData.period = period;
    if (teamLimit !== undefined) updateData.teamLimit = Number(teamLimit);
    if (orderLimit !== undefined) updateData.orderLimit = Number(orderLimit);
    if (productLimit !== undefined) updateData.productLimit = Number(productLimit);
    if (trialDays !== undefined) updateData.trialDays = Number(trialDays);
    if (features) updateData.features = JSON.stringify(features);

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return NextResponse.json({ plan: updated, message: "Plan updated successfully" });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
