import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject, sanitizeEmail, sanitizePhone } from "@/lib/sanitize";
import logger from "@/lib/logger";

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const customers = await db.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate stats
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + Number(c.orderCount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const vipCount = customers.filter(
      (c) => c.loyaltyTier === "gold" || c.loyaltyTier === "silver"
    ).length;

    // Tier breakdown
    const tierCounts = {
      new: customers.filter((c) => c.loyaltyTier === "new").length,
      bronze: customers.filter((c) => c.loyaltyTier === "bronze").length,
      silver: customers.filter((c) => c.loyaltyTier === "silver").length,
      gold: customers.filter((c) => c.loyaltyTier === "gold").length,
    };

    return NextResponse.json({
      customers,
      stats: {
        totalCustomers,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        vipCount,
        tierCounts,
      },
    });
  } catch (error: any) {
    logger.error("Failed to fetch customers", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
});

export const POST = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { organizationId, name, email, phone, city, address, notes, loyaltyTier } = body;
    const orgId = organizationId || authCtx.organizationId;

    if (!orgId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Ensure user can only create customers in their own org
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const customer = await db.customer.create({
      data: {
        organizationId: orgId,
        name,
        email: email || null,
        phone: phone || null,
        city: city || null,
        address: address || null,
        notes: notes || null,
        loyaltyTier: loyaltyTier || "new",
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    logger.error("Failed to create customer", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
});
