import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Status Rules API
// Stores rules in SystemSetting with key: "auto-status-rules-{orgId}"
// ─────────────────────────────────────────────────────────────────────────────

interface AutoStatusRule {
  id: string;
  triggerStatus: string;     // e.g. "delivered"
  targetStatus: string;      // e.g. "completed"
  delayHours: number;        // e.g. 24
  enabled: boolean;
}

// GET: Retrieve auto-status rules for an organization
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Auto-Status] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const orgId = authCtx.organizationId!;

    const setting = await db.systemSetting.findUnique({
      where: { key: `auto-status-rules-${orgId}` },
    });

    const rules: AutoStatusRule[] = setting
      ? JSON.parse(setting.value)
      : getDefaultRules();

    return NextResponse.json({ rules, orgId });
  } catch (error: any) {
    console.error("Fetch auto-status rules error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch auto-status rules" }, { status: 500 });
  }
});

// POST: Create or update auto-status rules for an organization
// This endpoint also supports cron calls (requireOrg: false to allow cron without org context)
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Auto-Status] POST request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    const { orgId, rules } = body;

    if (!orgId || !Array.isArray(rules)) {
      return NextResponse.json({ error: "orgId and rules array are required" }, { status: 400 });
    }

    // Security: if auth has an org, verify the body's orgId matches
    if (authCtx.organizationId && orgId !== authCtx.organizationId) {
      return NextResponse.json(
        { error: "Organization mismatch. You can only manage rules for your own organization." },
        { status: 403 }
      );
    }

    // Validate each rule
    for (const rule of rules) {
      if (!rule.triggerStatus || !rule.targetStatus || typeof rule.delayHours !== "number") {
        return NextResponse.json(
          { error: "Each rule must have triggerStatus, targetStatus, and delayHours" },
          { status: 400 }
        );
      }
      if (rule.delayHours < 0 || rule.delayHours > 720) {
        return NextResponse.json(
          { error: "delayHours must be between 0 and 720 (30 days)" },
          { status: 400 }
        );
      }
    }

    const value = JSON.stringify(rules);

    await db.systemSetting.upsert({
      where: { key: `auto-status-rules-${orgId}` },
      create: {
        key: `auto-status-rules-${orgId}`,
        value,
        category: "automation",
      },
      update: { value },
    });

    return NextResponse.json({ success: true, rules, orgId });
  } catch (error: any) {
    console.error("Save auto-status rules error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to save auto-status rules" }, { status: 500 });
  }
}, { requireOrg: false });

// Default auto-status rules
function getDefaultRules(): AutoStatusRule[] {
  return [
    {
      id: "rule-1",
      triggerStatus: "delivered",
      targetStatus: "completed",
      delayHours: 24,
      enabled: true,
    },
    {
      id: "rule-2",
      triggerStatus: "confirmed",
      targetStatus: "packed",
      delayHours: 4,
      enabled: false,
    },
    {
      id: "rule-3",
      triggerStatus: "packed",
      targetStatus: "dispatched",
      delayHours: 12,
      enabled: false,
    },
  ];
}
