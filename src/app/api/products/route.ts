import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: any = { organizationId: orgId };
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const products = await db.product.findMany({ where, orderBy: { createdAt: "desc" } });

    const [total, active, lowStock] = await Promise.all([
      db.product.count({ where: { organizationId: orgId } }),
      db.product.count({ where: { organizationId: orgId, status: "active" } }),
      db.product.count({ where: { organizationId: orgId, stock: { lt: 10 }, status: "active" } }),
    ]);

    const totalValue = await db.product.aggregate({
      where: { organizationId: orgId },
      _sum: { price: true },
    });

    return NextResponse.json({
      products,
      stats: { total, active, lowStock, totalValue: totalValue._sum.price || 0 },
    });
  } catch (error: any) {
    logger.error("Products API error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
});

export const POST = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { organizationId, name, sku, description, price, costPrice, stock, category, status } = body;
    const orgId = organizationId || authCtx.organizationId;

    if (!orgId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Ensure user can only create products in their own org
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const product = await db.product.create({
      data: {
        organizationId: orgId,
        name,
        sku: sku || null,
        description: description || null,
        price: parseFloat(price) || 0,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stock: parseInt(stock) || 0,
        category: category || null,
        status: status || "active",
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    logger.error("Create product API error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
});
