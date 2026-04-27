import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Follow-Up Rules API
// Stores rules in SystemSetting with key: "followup-rules-{orgId}"
// ─────────────────────────────────────────────────────────────────────────────

interface FollowUpRule {
  id: string;
  name: string;
  triggerStatus: string;
  delayHours: number;
  channel: "whatsapp" | "email" | "sms";
  messageTemplate: string;
  enabled: boolean;
  autoSend: boolean;
}

function getDefaultRules(): FollowUpRule[] {
  return [
    {
      id: "rule-confirm-1",
      name: "Order Confirmation",
      triggerStatus: "confirmed",
      delayHours: 1,
      channel: "whatsapp",
      messageTemplate: "Assalamu Alaikum! Your order {orderNumber} has been confirmed. Expected delivery: 3-5 business days.",
      enabled: true,
      autoSend: true,
    },
    {
      id: "rule-dispatch-1",
      name: "Dispatch Update",
      triggerStatus: "dispatched",
      delayHours: 2,
      channel: "whatsapp",
      messageTemplate: "Great news! Your order {orderNumber} has been dispatched. Track your order anytime.",
      enabled: true,
      autoSend: true,
    },
    {
      id: "rule-delivery-1",
      name: "Delivery Follow-Up",
      triggerStatus: "delivered",
      delayHours: 24,
      channel: "whatsapp",
      messageTemplate: "We hope you love your purchase! Please leave a review.",
      enabled: true,
      autoSend: false,
    },
    {
      id: "rule-thanks-1",
      name: "Thank You",
      triggerStatus: "delivered",
      delayHours: 48,
      channel: "email",
      messageTemplate: "Thank you for shopping with us! Here's a discount code for your next order.",
      enabled: true,
      autoSend: false,
    },
  ];
}

// GET: Retrieve follow-up rules for an organization
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[FollowUp Rules] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const orgId = authCtx.organizationId!;

    const setting = await db.systemSetting.findUnique({
      where: { key: `followup-rules-${orgId}` },
    });

    const rules: FollowUpRule[] = setting
      ? JSON.parse(setting.value)
      : getDefaultRules();

    // Return simulated history from orders
    return NextResponse.json({ rules, orgId });
  } catch (error: any) {
    logger.error("[FollowUp Rules] GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch follow-up rules" }, { status: 500 });
  }
});

// POST: Create a new follow-up rule
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[FollowUp Rules] POST request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const { name, triggerStatus, delayHours, channel, messageTemplate, enabled, autoSend } = body;

    if (!name || !triggerStatus || !channel) {
      return NextResponse.json({ error: "name, triggerStatus, and channel are required" }, { status: 400 });
    }
    if (typeof delayHours !== "number" || delayHours < 0 || delayHours > 720) {
      return NextResponse.json({ error: "delayHours must be between 0 and 720" }, { status: 400 });
    }
    if (!["whatsapp", "email", "sms"].includes(channel)) {
      return NextResponse.json({ error: "channel must be whatsapp, email, or sms" }, { status: 400 });
    }

    const setting = await db.systemSetting.findUnique({
      where: { key: `followup-rules-${orgId}` },
    });

    const existingRules: FollowUpRule[] = setting ? JSON.parse(setting.value) : getDefaultRules();

    const newRule: FollowUpRule = {
      id: `rule-${Date.now()}`,
      name,
      triggerStatus,
      delayHours,
      channel,
      messageTemplate: messageTemplate || "",
      enabled: enabled ?? true,
      autoSend: autoSend ?? false,
    };

    existingRules.push(newRule);

    await db.systemSetting.upsert({
      where: { key: `followup-rules-${orgId}` },
      create: { key: `followup-rules-${orgId}`, value: JSON.stringify(existingRules), category: "automation" },
      update: { value: JSON.stringify(existingRules) },
    });

    return NextResponse.json({ rule: newRule, rules: existingRules }, { status: 201 });
  } catch (error: any) {
    logger.error("[FollowUp Rules] POST error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create follow-up rule" }, { status: 500 });
  }
});

// PUT: Update a follow-up rule
export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[FollowUp Rules] PUT request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule id is required" }, { status: 400 });
    }

    const setting = await db.systemSetting.findUnique({
      where: { key: `followup-rules-${orgId}` },
    });

    if (!setting) {
      return NextResponse.json({ error: "No rules found for this organization" }, { status: 404 });
    }

    const rules: FollowUpRule[] = JSON.parse(setting.value);
    const ruleIndex = rules.findIndex((r) => r.id === id);

    if (ruleIndex === -1) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    rules[ruleIndex] = { ...rules[ruleIndex], ...updates, id };

    await db.systemSetting.update({
      where: { key: `followup-rules-${orgId}` },
      data: { value: JSON.stringify(rules) },
    });

    return NextResponse.json({ rule: rules[ruleIndex], rules });
  } catch (error: any) {
    logger.error("[FollowUp Rules] PUT error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update follow-up rule" }, { status: 500 });
  }
});
