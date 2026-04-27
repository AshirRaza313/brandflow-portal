import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ── Types ──

interface SLARule {
  id: string;
  fromStatus: string;
  toStatus: string;
  timeLimitHours: number;
  responsibleRole: string;
  enabled: boolean;
}

const DEFAULT_RULES: SLARule[] = [
  { id: "default-1", fromStatus: "pending", toStatus: "confirmed", timeLimitHours: 24, responsibleRole: "sales_manager", enabled: true },
  { id: "default-2", fromStatus: "confirmed", toStatus: "packed", timeLimitHours: 48, responsibleRole: "warehouse_manager", enabled: true },
  { id: "default-3", fromStatus: "packed", toStatus: "dispatched", timeLimitHours: 24, responsibleRole: "warehouse_manager", enabled: true },
  { id: "default-4", fromStatus: "dispatched", toStatus: "delivered", timeLimitHours: 120, responsibleRole: "support_agent", enabled: true },
];

// ── Helpers ──

function getRules(rules: SLARule[], fromStatus: string, toStatus: string): SLARule | undefined {
  return rules.find((r) => r.enabled && r.fromStatus === fromStatus && r.toStatus === toStatus);
}

function formatDuration(ms: number): string {
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// ── GET: Scan all active orders for SLA compliance ──

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

    // Fetch SLA rules
    const setting = await db.systemSetting.findUnique({
      where: { key: `sla-rules-${orgId}` },
    });

    let rules: SLARule[];
    if (setting) {
      try {
        rules = JSON.parse(setting.value);
      } catch {
        rules = DEFAULT_RULES;
      }
    } else {
      rules = DEFAULT_RULES;
    }

    // Fetch all non-delivered, non-cancelled orders
    const now = new Date();
    const orders = await db.order.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["delivered", "cancelled"] },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Also fetch recently delivered orders (last 24h) for compliance tracking
    const recentDelivered = await db.order.findMany({
      where: {
        organizationId: orgId,
        status: "delivered",
        updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
    });

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const approachingBreach: any[] = [];
    const breached: any[] = [];
    const compliant: any[] = [];
    let totalOrders = orders.length;
    let compliantCount = 0;

    for (const order of orders) {
      const orderAge = now.getTime() - order.createdAt.getTime();
      const rule = getRules(rules, "pending", order.status === "confirmed" ? "confirmed" : order.status === "packed" ? "confirmed" : order.status === "dispatched" ? "packed" : "pending");

      // Determine the relevant SLA rule based on current status
      let relevantRule: SLARule | undefined;
      if (order.status === "pending") {
        relevantRule = getRules(rules, "pending", "confirmed");
      } else if (order.status === "confirmed") {
        relevantRule = getRules(rules, "confirmed", "packed");
      } else if (order.status === "packed") {
        relevantRule = getRules(rules, "packed", "dispatched");
      } else if (order.status === "dispatched") {
        relevantRule = getRules(rules, "dispatched", "delivered");
      }

      const orderData: any = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || "Unknown",
        status: order.status,
        total: order.total,
        createdAt: order.createdAt.toISOString(),
        age: orderAge,
        ageFormatted: formatDuration(orderAge),
      };

      if (!relevantRule) {
        // No SLA rule for this status transition — considered compliant
        compliantCount++;
        compliant.push({ ...orderData, slaStatus: "no_rule" });
        continue;
      }

      const limitMs = relevantRule.timeLimitHours * 60 * 60 * 1000;
      const remaining = limitMs - orderAge;
      const timeLimitHours = relevantRule.timeLimitHours;
      const responsibleRole = relevantRule.responsibleRole;

      orderData.timeLimitHours = timeLimitHours;
      orderData.responsibleRole = responsibleRole;
      orderData.remainingMs = remaining;
      orderData.remainingFormatted = remaining > 0 ? formatDuration(remaining) : formatDuration(Math.abs(remaining));

      if (remaining <= 0) {
        // Breached
        orderData.slaStatus = "breached";
        orderData.breachByMs = Math.abs(remaining);
        orderData.breachByFormatted = formatDuration(Math.abs(remaining));
        breached.push(orderData);
      } else if (remaining <= twoHoursMs) {
        // Approaching breach
        orderData.slaStatus = "warning";
        approachingBreach.push(orderData);
      } else {
        // Compliant
        orderData.slaStatus = "compliant";
        compliantCount++;
        compliant.push(orderData);
      }
    }

    // Calculate compliance rate
    const complianceRate = totalOrders > 0 ? Math.round((compliantCount / totalOrders) * 100) : 100;

    // Average response/resolution times per status
    const statusGroups: Record<string, { count: number; totalAge: number }> = {};
    for (const order of orders) {
      if (!statusGroups[order.status]) statusGroups[order.status] = { count: 0, totalAge: 0 };
      statusGroups[order.status].count++;
      statusGroups[order.status].totalAge += now.getTime() - order.createdAt.getTime();
    }

    const avgTimesPerStatus = Object.entries(statusGroups).map(([status, data]) => ({
      status,
      count: data.count,
      avgAgeMs: Math.round(data.totalAge / data.count),
      avgAgeFormatted: formatDuration(Math.round(data.totalAge / data.count)),
    }));

    // Performance by team role
    const rolePerformance: Record<string, { total: number; breached: number; warning: number }> = {};
    for (const rule of rules.filter((r) => r.enabled)) {
      if (!rolePerformance[rule.responsibleRole]) {
        rolePerformance[rule.responsibleRole] = { total: 0, breached: 0, warning: 0 };
      }
    }
    for (const order of [...breached, ...approachingBreach, ...compliant]) {
      if (order.responsibleRole && rolePerformance[order.responsibleRole]) {
        rolePerformance[order.responsibleRole].total++;
        if (order.slaStatus === "breached") rolePerformance[order.responsibleRole].breached++;
        if (order.slaStatus === "warning") rolePerformance[order.responsibleRole].warning++;
      }
    }

    const teamPerformance = Object.entries(rolePerformance).map(([role, data]) => ({
      role,
      total: data.total,
      breached: data.breached,
      warning: data.warning,
      compliant: data.total - data.breached - data.warning,
      complianceRate: data.total > 0 ? Math.round(((data.total - data.breached) / data.total) * 100) : 100,
    }));

    // Breaches today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const breachesToday = breached.length;

    // Critical alerts = breached + warning
    const criticalAlerts = breached.length + approachingBreach.length;

    return NextResponse.json({
      complianceRate,
      totalOrders,
      compliantOrders: compliantCount,
      breachedOrders: breached.length,
      warningOrders: approachingBreach.length,
      breachesToday,
      criticalAlerts,
      approachingBreach,
      breached,
      compliant: compliant.slice(0, 20),
      avgTimesPerStatus,
      teamPerformance,
    });
  } catch (error: any) {
    logger.error("SLA check error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to check SLA compliance" }, { status: 500 });
  }
});
