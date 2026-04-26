import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// GET /api/admin/clients/[id] — Admin-only: return full details for one organization
export const GET = withAuth(async (req: NextRequest, authCtx, context) => {
  const { id } = await context.params;
  logger.info("[Admin Client Detail] GET request", { userId: authCtx.userId, clientId: id });
  try {
    await ensureDb();

    const org = await db.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, image: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            members: true,
            products: true,
            orders: true,
            customers: true,
            expenses: true,
            teamTasks: true,
            coupons: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Revenue total
    const revenueResult = await db.order.aggregate({
      where: { organizationId: id },
      _sum: { total: true },
    });

    // Recent orders (last 10)
    const recentOrders = await db.order.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    // Team members with details
    const teamMembers = org.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      image: m.user.image,
      joinedAt: m.joinedAt,
      isOwner: m.joinedAt === org.members[0]?.joinedAt,
    }));

    // Owner (first member)
    const owner = org.members[0]?.user
      ? {
          id: org.members[0].user.id,
          name: org.members[0].user.name,
          email: org.members[0].user.email,
          role: org.members[0].role,
        }
      : null;

    // Subscription info
    const subscription = org.subscription
      ? {
          id: org.subscription.id,
          status: org.subscription.status,
          planName: org.subscription.plan?.name || org.plan,
          planId: org.subscription.planId,
          billingCycle: org.subscription.billingCycle,
          currentPeriodEnd: org.subscription.currentPeriodEnd,
          trialStartsAt: org.subscription.trialStartsAt,
          trialEndsAt: org.subscription.trialEndsAt,
          lastReminderAt: org.subscription.lastReminderAt,
          reminderCount: org.subscription.reminderCount,
        }
      : null;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        email: org.email,
        phone: org.phone,
        website: org.website,
        plan: org.plan || "starter",
        currency: org.currency,
        timezone: org.timezone,
        country: org.country,
        religion: org.religion,
        brandTagline: org.brandTagline,
        brandColor: org.brandColor,
        brandDescription: org.brandDescription,
        address: org.address,
        taxId: org.taxId,
        isActive: org.isActive,
        isBanned: org.isBanned,
        banReason: org.banReason,
        bannedAt: org.bannedAt,
        paymentRejectionCount: org.paymentRejectionCount,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
      stats: {
        memberCount: org._count.members,
        productCount: org._count.products,
        orderCount: org._count.orders,
        customerCount: org._count.customers,
        expenseCount: org._count.expenses,
        taskCount: org._count.teamTasks,
        couponCount: org._count.coupons,
        revenueTotal: revenueResult._sum.total || 0,
      },
      owner,
      teamMembers,
      recentOrders,
      subscription,
    });
  } catch (error: any) {
    console.error("Admin client detail API error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

// PUT /api/admin/clients/[id] — Admin-only: manage client (suspend, ban, change plan, etc.)
export const PUT = withAuth(async (req: NextRequest, authCtx, context) => {
  const { id } = await context.params;
  logger.info("[Admin Client Manage] PUT request", { userId: authCtx.userId, clientId: id });
  try {
    await ensureDb();

    const body = await req.json();
    const { action, ...data } = body;

    // Verify org exists
    const existing = await db.organization.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let result;

    switch (action) {
      case "suspend": {
        result = await db.organization.update({
          where: { id },
          data: { isActive: false },
        });
        break;
      }

      case "activate": {
        result = await db.organization.update({
          where: { id },
          data: { isActive: true },
        });
        break;
      }

      case "ban": {
        if (!data.banReason) {
          return NextResponse.json({ error: "Ban reason is required" }, { status: 400 });
        }
        result = await db.organization.update({
          where: { id },
          data: {
            isBanned: true,
            banReason: data.banReason,
            bannedAt: new Date(),
          },
        });
        // Create notification for org owner
        const owner = await db.organizationMember.findFirst({
          where: { organizationId: id },
          orderBy: { joinedAt: "asc" },
        });
        if (owner) {
          await db.notification.create({
            data: {
              orgId: id,
              userId: owner.userId,
              title: "Organization Banned",
              message: `Your organization "${existing.name}" has been banned. Reason: ${data.banReason}. Please contact support if you believe this is an error.`,
              type: "warning",
            },
          });
        }
        break;
      }

      case "unban": {
        result = await db.organization.update({
          where: { id },
          data: {
            isBanned: false,
            banReason: null,
            bannedAt: null,
          },
        });
        // Create notification for org owner
        const owner = await db.organizationMember.findFirst({
          where: { organizationId: id },
          orderBy: { joinedAt: "asc" },
        });
        if (owner) {
          await db.notification.create({
            data: {
              orgId: id,
              userId: owner.userId,
              title: "Organization Unbanned",
              message: `Your organization "${existing.name}" has been unbanned and access restored.`,
              type: "success",
            },
          });
        }
        break;
      }

      case "change-plan": {
        const validPlans = ["starter", "growth", "enterprise"];
        if (!data.plan || !validPlans.includes(data.plan)) {
          return NextResponse.json({ error: "Invalid plan. Must be starter, growth, or enterprise." }, { status: 400 });
        }
        // Update organization plan
        result = await db.organization.update({
          where: { id },
          data: { plan: data.plan },
        });
        // Also update subscription if exists
        if (data.planId) {
          const subExists = await db.subscription.findUnique({ where: { organizationId: id } });
          if (subExists) {
            await db.subscription.update({
              where: { organizationId: id },
              data: { planId: data.planId },
            });
          }
        }
        // Notify owner
        const owner = await db.organizationMember.findFirst({
          where: { organizationId: id },
          orderBy: { joinedAt: "asc" },
        });
        if (owner) {
          await db.notification.create({
            data: {
              orgId: id,
              userId: owner.userId,
              title: "Plan Changed",
              message: `Your organization's plan has been changed to ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} by the platform admin.`,
              type: "info",
            },
          });
        }
        break;
      }

      case "update-info": {
        const updateData: Record<string, any> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.website !== undefined) updateData.website = data.website;

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        result = await db.organization.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case "reset-order-count": {
        // This is for special cases - reset order count display (doesn't delete orders)
        // We don't actually delete orders, just log this action
        logger.warn("[Admin Client Manage] Order count reset requested", { clientId: id, adminId: authCtx.userId });
        result = existing;
        break;
      }

      case "send-notification": {
        if (!data.title || !data.message) {
          return NextResponse.json({ error: "Notification title and message are required" }, { status: 400 });
        }
        // Send notification to the org's owner
        const owner = await db.organizationMember.findFirst({
          where: { organizationId: id },
          orderBy: { joinedAt: "asc" },
        });
        if (!owner) {
          return NextResponse.json({ error: "No owner found for this organization" }, { status: 404 });
        }
        await db.notification.create({
          data: {
            orgId: id,
            userId: owner.userId,
            title: data.title,
            message: data.message,
            type: data.type || "info",
            actionUrl: data.actionUrl || undefined,
          },
        });
        return NextResponse.json({ success: true, message: "Notification sent successfully" });
      }

      default:
        return NextResponse.json({ error: "Invalid action. Use: suspend, activate, ban, unban, change-plan, update-info, reset-order-count, send-notification" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Action "${action}" completed successfully`,
      organization: result,
    });
  } catch (error: any) {
    console.error("Admin client manage API error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to manage client" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
