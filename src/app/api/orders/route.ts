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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") || "desc";

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // Security: Ensure user can only access their own org's data
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: any = { organizationId: orgId };
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    // Validate sort field
    const validSortFields = ["createdAt", "total", "status", "orderNumber", "subtotal"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderDirection = sortDir === "asc" ? "asc" : "desc";

    const [orders, totalCount] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { select: { productName: true, quantity: true, price: true, total: true } },
        },
        orderBy: { [orderField]: orderDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    // Stats (always for the org, not filtered by search/pagination)
    const [total, pending, confirmed, dispatched, delivered] = await Promise.all([
      db.order.count({ where: { organizationId: orgId } }),
      db.order.count({ where: { organizationId: orgId, status: "pending" } }),
      db.order.count({ where: { organizationId: orgId, status: "confirmed" } }),
      db.order.count({ where: { organizationId: orgId, status: { in: ["packed", "dispatched"] } } }),
      db.order.count({ where: { organizationId: orgId, status: "delivered" } }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: { total, pending, confirmed, dispatched, delivered },
    });
  } catch (error: any) {
    logger.error("Fetch orders error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
});

export const POST = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { customerId, channel, notes, items } = body;
    const organizationId = authCtx.organizationId || body.organizationId;

    if (!organizationId || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Order limit enforcement (lifetime) ──
    // Platform roles (platform_owner, platform_admin, owner) bypass order limits.
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true, paymentRejectionCount: true, isBanned: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (org.isBanned) return NextResponse.json({ error: "Organization is suspended" }, { status: 403 });

    // Skip order limit check for platform admin roles
    const isPlatformAdmin = authCtx.role === "platform_owner" || authCtx.role === "platform_admin" || authCtx.role === "owner";

    if (!isPlatformAdmin && org.plan === "starter") {
      const plan = await db.subscriptionPlan.findFirst({ where: { name: "starter" } });
      if (plan && plan.orderLimit > 0) {
        const currentOrderCount = await db.order.count({ where: { organizationId } });
        if (currentOrderCount >= plan.orderLimit) {
          return NextResponse.json({
            error: `Order limit reached`,
            message: `Your Starter plan allows ${plan.orderLimit} orders (lifetime). You have used ${currentOrderCount} orders. Please upgrade to Growth plan for unlimited orders.`,
            code: "ORDER_LIMIT_REACHED",
            currentCount: currentOrderCount,
            limit: plan.orderLimit,
          }, { status: 403 });
        }
      }
    }

    // Security: Ensure user can only create orders in their own org
    if (organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate order number
    const lastOrder = await db.order.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    });
    let counter = 1;
    if (lastOrder?.orderNumber) {
      counter = parseInt(lastOrder.orderNumber.replace("VTX-", "")) + 1;
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const order = await db.order.create({
      data: {
        orderNumber: `VTX-${String(counter).padStart(4, "0")}`,
        organizationId,
        customerId: customerId || null,
        channel: channel || "manual",
        notes: notes || null,
        subtotal,
        total: subtotal,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          })),
        },
      },
      include: { customer: { select: { name: true } }, items: true },
    });

    // Update customer stats (verify customer belongs to same org)
    if (customerId) {
      const customerExists = await db.customer.findFirst({
        where: { id: customerId, organizationId },
      });
      if (customerExists) {
        await db.customer.update({
          where: { id: customerId },
          data: { totalSpent: { increment: subtotal }, orderCount: { increment: 1 } },
        });
      }
    }

    // Update product stock (verify products belong to same org)
    for (const item of items) {
      const productExists = await db.product.findFirst({
        where: { id: item.productId, organizationId },
      });
      if (productExists) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // ── Auto-generate 4 tasks for the new order ──
    const orderNum = order.orderNumber;
    const autoTasks = [
      { title: `Confirm order ${orderNum} with customer`, assignedTo: "sales_manager", priority: "critical" },
      { title: `Send WhatsApp confirmation for ${orderNum}`, assignedTo: "support_agent", priority: "high" },
      { title: `Pack order ${orderNum}`, assignedTo: "warehouse_manager", priority: "medium" },
      { title: `Verify stock for order ${orderNum}`, assignedTo: "inventory_clerk", priority: "high" },
    ];

    try {
      await Promise.all(
        autoTasks.map((t) =>
          db.teamTask.create({
            data: {
              organizationId,
              title: t.title,
              assignedTo: t.assignedTo,
              priority: t.priority,
              status: "todo",
              description: `Auto-generated task for order ${orderNum}`,
            },
          })
        )
      );
    } catch (taskErr: any) {
      // Log task creation failure but don't fail the order creation
      logger.warn("Auto-task creation failed (non-blocking)", taskErr.message, { orderNumber: orderNum });
    }

    return NextResponse.json({ order, autoTasksCreated: true }, { status: 201 });
  } catch (error: any) {
    logger.error("Create order error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('Database connection')) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
});
