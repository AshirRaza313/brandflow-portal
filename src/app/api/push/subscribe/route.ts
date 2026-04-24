import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// ── Ensure the push_subscriptions table exists (raw SQL for flexibility) ──

async function ensurePushTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId"      TEXT NOT NULL,
      "orgId"       TEXT,
      endpoint      TEXT NOT NULL,
      "keysAuth"    TEXT NOT NULL,
      "keysP256dh"  TEXT NOT NULL,
      "userAgent"   TEXT,
      "createdAt"   TIMESTAMPTZ DEFAULT now()
    );
  `);
  // Add indexes if they don't exist (safe to run multiple times)
  try {
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_push_sub_userId ON push_subscriptions ("userId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_push_sub_orgId ON push_subscriptions ("orgId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions (endpoint);`);
  } catch {
    // Indexes may already exist, that's fine
  }
}

// ── POST /api/push/subscribe — Save a push subscription ──

export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Push Subscribe] POST request", { userId: authCtx.userId });
    await ensureDb();
    await ensurePushTable();

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { userId, orgId, endpoint, keysAuth, keysP256dh, userAgent } = body;

    if (!userId || !endpoint || !keysAuth || !keysP256dh) {
      return NextResponse.json(
        { error: "userId, endpoint, keysAuth, and keysP256dh are required" },
        { status: 400 }
      );
    }

    // Upsert: delete any existing subscription for the same endpoint, then insert
    await db.$executeRawUnsafe(
      `DELETE FROM push_subscriptions WHERE endpoint = $1`,
      endpoint
    );

    await db.$executeRawUnsafe(
      `INSERT INTO push_subscriptions ("userId", "orgId", endpoint, "keysAuth", "keysP256dh", "userAgent")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      userId,
      orgId || null,
      endpoint,
      keysAuth,
      keysP256dh,
      userAgent || null
    );

    return NextResponse.json({ success: true, message: "Push subscription saved" });
  } catch (error: any) {
    console.error("[Push/Subscribe] Error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 });
  }
});

// ── DELETE /api/push/subscribe — Remove a push subscription ──

export const DELETE = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Push Subscribe] DELETE request", { userId: authCtx.userId });
    await ensureDb();
    await ensurePushTable();

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `DELETE FROM push_subscriptions WHERE endpoint = $1`,
      endpoint
    );

    return NextResponse.json({ success: true, message: "Push subscription removed" });
  } catch (error: any) {
    console.error("[Push/Subscribe] Delete error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to remove push subscription" }, { status: 500 });
  }
});
