import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { SLARule, validateSLARule } from "@/lib/sla-contract";

const DEFAULT_RULES: SLARule[] = [
  { id: "default-1", name: "Order Confirmation", fromStatus: "pending", toStatus: "confirmed", timeLimitHours: 24, responsibleRole: "sales_manager", escalationAction: "Auto-notify team lead after 18 hours", enabled: true },
  { id: "default-2", name: "Packaging", fromStatus: "confirmed", toStatus: "packed", timeLimitHours: 48, responsibleRole: "warehouse_manager", escalationAction: "Escalate to operations lead after 36 hours", enabled: true },
  { id: "default-3", name: "Dispatch Preparation", fromStatus: "packed", toStatus: "dispatched", timeLimitHours: 24, responsibleRole: "warehouse_manager", escalationAction: "Escalate to logistics coordinator after 18 hours", enabled: true },
  { id: "default-4", name: "Delivery Completion", fromStatus: "dispatched", toStatus: "delivered", timeLimitHours: 120, responsibleRole: "support_agent", escalationAction: "Customer follow-up after 72 hours if not delivered", enabled: true },
];

function cloneDefaults(): SLARule[] {
  return DEFAULT_RULES.map((rule) => ({ ...rule }));
}

function parseStoredRules(raw: string): SLARule[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaults();
    const validRules: SLARule[] = [];
    for (const rawRule of parsed) {
      const result = validateSLARule(rawRule as any);
      if (result.valid) validRules.push(result.rule);
    }
    return validRules.length > 0 ? validRules : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

function getRule(rules: SLARule[], fromStatus: string, toStatus: string): SLARule | undefined {
  return rules.find((rule) => rule.enabled && rule.fromStatus === fromStatus && rule.toStatus === toStatus);
}

function formatDuration(ms: number): string {
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export const GET = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });
    if (orgId !== authCtx.organizationId) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const setting = await withRetry(async () => {
      return await db.systemSetting.findUnique({ where: { key: `sla-rules-${orgId}` } });
    }, 2, 500);

    const rules = setting ? parseStoredRules(setting.value) : cloneDefaults();

    const now = new Date();
    const orders = await withRetry(async () => {
      return await db.order.findMany({
        where: { organizationId: orgId, status: { notIn: ["delivered", "cancelled"] } },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });
    }, 2, 500);

    const recentDelivered = await withRetry(async () => {
      return await db.order.findMany({
        where: {
          organizationId: orgId,
          status: "delivered",
          updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: "desc" },
      });
    }, 2, 500);

    const twoHoursMs = 2 * 60 * 60 * 1000;
    const approachingBreach: any[] = [];
    const breached: any[] = [];
    const compliant: any[] = [];
    let totalOrders = orders.length;
    let compliantCount = 0;

    for (const order of orders) {
      const orderAge = now.getTime() - order.createdAt.getTime();
      let relevantRule: SLARule | undefined;
      if (order.status === "pending") relevantRule = getRule(rules, "pending", "confirmed");
      else if (order.status === "confirmed") relevantRule = getRule(rules, "confirmed", "packed");
      else if (order.status === "packed") relevantRule = getRule(rules, "packed", "dispatched");
      else if (order.status === "dispatched") relevantRule = getRule(rules, "dispatched", "delivered");

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
        compliantCount++;
        compliant.push({ ...orderData, slaStatus: "no_rule" });
        continue;
      }

      const limitMs = relevantRule.timeLimitHours * 60 * 60 * 1000;
      const remaining = limitMs - orderAge;
      orderData.timeLimitHours = relevantRule.timeLimitHours;
      orderData.responsibleRole = relevantRule.responsibleRole;
      orderData.remainingMs = remaining;
      orderData.remainingFormatted = remaining > 0 ? formatDuration(remaining) : formatDuration(Math.abs(remaining));

      if (remaining <= 0) {
        orderData.slaStatus = "breached";
        orderData.breachByMs = Math.abs(remaining);
        orderData.breachByFormatted = formatDuration(Math.abs(remaining));
        breached.push(orderData);
      } else if (remaining <= twoHoursMs) {
        orderData.slaStatus = "warning";
        approachingBreach.push(orderData);
      } else {
        orderData.slaStatus = "compliant";
        compliantCount++;
        compliant.push(orderData);
      }
    }

    const complianceRate = totalOrders > 0 ? Math.round((compliantCount / totalOrders) * 100) : 100;

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

    const breachesToday = breached.length;
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
  } catch (error: unknown) {
    logger.error("SLA check error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to check SLA compliance" }, { status: 500 });
  }
}), { maxRequests: 60, windowSeconds: 60 });
