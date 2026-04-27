import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Team Penalty API
// Stores penalty records in SystemSetting with key: "penalties-{orgId}"
// ─────────────────────────────────────────────────────────────────────────────

interface Penalty {
  id: string;
  memberId: string;
  memberName: string;
  reason: string;
  severity: "warning" | "minor" | "major" | "critical";
  restrictions: string[];
  duration: number;
  imposedBy: string;
  imposedAt: string;
  expiresAt: string;
  isActive: boolean;
}

// GET: Retrieve penalty records for an organization
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Penalties] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const orgId = authCtx.organizationId!;

    const setting = await db.systemSetting.findUnique({
      where: { key: `penalties-${orgId}` },
    });

    let penalties: Penalty[] = setting ? JSON.parse(setting.value) : [];

    // Auto-expire penalties
    const now = new Date();
    penalties = penalties.map((p) => {
      if (p.isActive && new Date(p.expiresAt) <= now) {
        return { ...p, isActive: false };
      }
      return p;
    });

    const active = penalties.filter((p) => p.isActive);
    const history = penalties.filter((p) => !p.isActive);

    return NextResponse.json({ penalties, active, history, orgId });
  } catch (error: any) {
    logger.error("[Penalties] GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch penalties" }, { status: 500 });
  }
});

// POST: Create a new penalty for a team member
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Penalties] POST request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const { memberId, memberName, reason, severity, restrictions, duration } = body;

    if (!memberId || !memberName || !reason || !severity) {
      return NextResponse.json({ error: "memberId, memberName, reason, and severity are required" }, { status: 400 });
    }
    if (!["warning", "minor", "major", "critical"].includes(severity)) {
      return NextResponse.json({ error: "severity must be warning, minor, major, or critical" }, { status: 400 });
    }
    if (typeof duration !== "number" || duration <= 0) {
      return NextResponse.json({ error: "duration must be a positive number (hours)" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 60 * 1000);

    const newPenalty: Penalty = {
      id: `pen-${Date.now()}`,
      memberId,
      memberName,
      reason,
      severity,
      restrictions: restrictions || [],
      duration,
      imposedBy: authCtx.userId,
      imposedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
    };

    const setting = await db.systemSetting.findUnique({
      where: { key: `penalties-${orgId}` },
    });

    const existing: Penalty[] = setting ? JSON.parse(setting.value) : [];
    existing.push(newPenalty);

    await db.systemSetting.upsert({
      where: { key: `penalties-${orgId}` },
      create: { key: `penalties-${orgId}`, value: JSON.stringify(existing), category: "team" },
      update: { value: JSON.stringify(existing) },
    });

    return NextResponse.json({ penalty: newPenalty, penalties: existing }, { status: 201 });
  } catch (error: any) {
    logger.error("[Penalties] POST error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create penalty" }, { status: 500 });
  }
});

// PUT: Update or lift a penalty
export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Penalties] PUT request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const { id, _lift, _remove, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Penalty id is required" }, { status: 400 });
    }

    const setting = await db.systemSetting.findUnique({
      where: { key: `penalties-${orgId}` },
    });

    if (!setting) {
      return NextResponse.json({ error: "No penalties found" }, { status: 404 });
    }

    let penalties: Penalty[] = JSON.parse(setting.value);

    if (_remove) {
      penalties = penalties.filter((p) => p.id !== id);
    } else {
      const index = penalties.findIndex((p) => p.id === id);
      if (index === -1) {
        return NextResponse.json({ error: "Penalty not found" }, { status: 404 });
      }
      if (_lift) {
        penalties[index] = { ...penalties[index], isActive: false };
      } else {
        penalties[index] = { ...penalties[index], ...updates, id };
      }
    }

    await db.systemSetting.update({
      where: { key: `penalties-${orgId}` },
      data: { value: JSON.stringify(penalties) },
    });

    const active = penalties.filter((p) => p.isActive);
    const history = penalties.filter((p) => !p.isActive);

    return NextResponse.json({ penalties, active, history });
  } catch (error: any) {
    logger.error("[Penalties] PUT error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update penalty" }, { status: 500 });
  }
});
