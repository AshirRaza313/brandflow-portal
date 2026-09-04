import { NextRequest, NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry} from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { validateSLARule, SLARule } from "@/lib/sla-contract";

// ── Default Rules (immutable, always copied before use) ──
const DEFAULT_RULES: SLARule[] = [
  {
    id: "default-1",
    name: "Order Confirmation",
    fromStatus: "pending",
    toStatus: "confirmed",
    timeLimitHours: 24,
    responsibleRole: "sales_manager",
    escalationAction: "Auto-notify team lead after 18 hours",
    enabled: true,
  },
  {
    id: "default-2",
    name: "Packaging",
    fromStatus: "confirmed",
    toStatus: "packed",
    timeLimitHours: 48,
    responsibleRole: "warehouse_manager",
    escalationAction: "Escalate to operations lead after 36 hours",
    enabled: true,
  },
  {
    id: "default-3",
    name: "Dispatch Preparation",
    fromStatus: "packed",
    toStatus: "dispatched",
    timeLimitHours: 24,
    responsibleRole: "warehouse_manager",
    escalationAction: "Escalate to logistics coordinator after 18 hours",
    enabled: true,
  },
  {
    id: "default-4",
    name: "Delivery Completion",
    fromStatus: "dispatched",
    toStatus: "delivered",
    timeLimitHours: 120,
    responsibleRole: "support_agent",
    escalationAction: "Customer follow-up after 72 hours if not delivered",
    enabled: true,
  },
];

function cloneDefaults(): SLARule[] {
  return DEFAULT_RULES.map(r => ({ ...r }));
}

function parseStoredRules(raw: string): SLARule[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaults();
    const validRules: SLARule[] = [];
    for (const rawRule of parsed) {
      const result = validateSLARule(rawRule as any);
      if (result.valid) {
        validRules.push(result.rule);
      }
    }
    return validRules.length > 0 ? validRules : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

// ── GET: Fetch SLA rules for the organization ──
export const GET = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || authCtx.organizationId;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const setting = await withRetry(async () => {
      return await db.systemSetting.findUnique({
        where: { key: `sla-rules-${orgId}` },
      });
    }, 2, 500);

    const rules = setting ? parseStoredRules(setting.value) : cloneDefaults();
    return NextResponse.json({ rules, total: rules.length, active: rules.filter((r) => r.enabled).length });
  } catch (error: unknown) {
    logger.error("SLA rules GET error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to fetch SLA rules" }, { status: 500 });
  }
}), { maxRequests: 60, windowSeconds: 60 });

// ── POST: Create a new SLA rule ──
export const POST = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { organizationId, name, fromStatus, toStatus, timeLimitHours, responsibleRole, escalationAction } = body;
    const orgId = organizationId || authCtx.organizationId;

    if (!orgId || !name || !fromStatus || !toStatus || !timeLimitHours) {
      return NextResponse.json({ error: "Missing required fields: name, fromStatus, toStatus, timeLimitHours" }, { status: 400 });
    }
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const rawRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      fromStatus,
      toStatus,
      timeLimitHours: Number(timeLimitHours),
      responsibleRole,
      escalationAction,
      enabled: true,
    };
    const validation = validateSLARule(rawRule);
    if (!validation.valid) {
      return NextResponse.json({ error: `Invalid rule: ${validation.reason}` }, { status: 400 });
    }

    const setting = await withRetry(async () => {
      return await db.systemSetting.findUnique({
        where: { key: `sla-rules-${orgId}` },
      });
    }, 2, 500);

    const rules = setting ? parseStoredRules(setting.value) : cloneDefaults();
    rules.push(validation.rule);

    await withRetry(async () => {
      return await db.systemSetting.upsert({
        where: { key: `sla-rules-${orgId}` },
        create: { key: `sla-rules-${orgId}`, value: JSON.stringify(rules), category: "sla" },
        update: { value: JSON.stringify(rules) },
      });
    }, 2, 500);

    return NextResponse.json({ rule: validation.rule, rules }, { status: 201 });
  } catch (error: unknown) {
    logger.error("SLA rules POST error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to create SLA rule" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });

// ── PUT: Update existing SLA rules (batch update) ──
export const PUT = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { organizationId, rules: updatedRules } = body;
    const orgId = organizationId || authCtx.organizationId;

    if (!orgId || !updatedRules || !Array.isArray(updatedRules)) {
      return NextResponse.json({ error: "Missing required fields: rules (array)" }, { status: 400 });
    }
    if (orgId !== authCtx.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const sanitizedRules: SLARule[] = [];
    for (const raw of updatedRules) {
      const validation = validateSLARule(raw as any);
      if (!validation.valid) {
        return NextResponse.json({ error: `Invalid rule: ${validation.reason}` }, { status: 400 });
      }
      sanitizedRules.push(validation.rule);
    }

    await withRetry(async () => {
      return await db.systemSetting.upsert({
        where: { key: `sla-rules-${orgId}` },
        create: { key: `sla-rules-${orgId}`, value: JSON.stringify(sanitizedRules), category: "sla" },
        update: { value: JSON.stringify(sanitizedRules) },
      });
    }, 2, 500);

    return NextResponse.json({ rules: sanitizedRules, total: sanitizedRules.length });
  } catch (error: unknown) {
    logger.error("SLA rules PUT error", error, { orgId: authCtx?.organizationId });
    if (isDbUnavailable(error)) return dbErrorResponse(error);
    return NextResponse.json({ error: "Failed to update SLA rules" }, { status: 500 });
  }
}), { maxRequests: 30, windowSeconds: 60 });

