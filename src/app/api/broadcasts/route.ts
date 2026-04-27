import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

interface Broadcast {
  id: string;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  status: "draft" | "scheduled" | "sent" | "failed";
  targetAudience: "all" | "vip" | "new" | "inactive" | "segment";
  message: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

async function getBroadcasts(orgId: string): Promise<Broadcast[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: `broadcasts-${orgId}` },
  });
  if (!setting) return [];
  try {
    return JSON.parse(setting.value);
  } catch {
    return [];
  }
}

async function saveBroadcasts(orgId: string, broadcasts: Broadcast[]) {
  await db.systemSetting.upsert({
    where: { key: `broadcasts-${orgId}` },
    create: { key: `broadcasts-${orgId}`, value: JSON.stringify(broadcasts), category: "broadcasts" },
    update: { value: JSON.stringify(broadcasts) },
  });
}

export const GET = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const broadcasts = await getBroadcasts(orgId);
    return NextResponse.json({ broadcasts });
  } catch (error: any) {
    logger.error("Broadcasts GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
});

export const POST = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { name, channel, targetAudience, message, scheduledAt, status } = body;

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    const broadcasts = await getBroadcasts(orgId);
    const newBroadcast: Broadcast = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      channel: channel || "whatsapp",
      status: status || "draft",
      targetAudience: targetAudience || "all",
      message: message.trim(),
      scheduledAt: scheduledAt || undefined,
      recipientCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: new Date().toISOString(),
    };
    broadcasts.unshift(newBroadcast);
    await saveBroadcasts(orgId, broadcasts);

    return NextResponse.json({ broadcast: newBroadcast }, { status: 201 });
  } catch (error: any) {
    logger.error("Broadcasts POST error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
  }
});

export const PUT = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Broadcast ID required" }, { status: 400 });

    const broadcasts = await getBroadcasts(orgId);
    const idx = broadcasts.findIndex((b) => b.id === id);
    if (idx === -1) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });

    broadcasts[idx] = { ...broadcasts[idx], ...updates };
    await saveBroadcasts(orgId, broadcasts);

    return NextResponse.json({ broadcast: broadcasts[idx] });
  } catch (error: any) {
    logger.error("Broadcasts PUT error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update broadcast" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req, authCtx) => {
  try {
    await ensureDb();
    const orgId = authCtx.organizationId;
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Broadcast ID required" }, { status: 400 });

    const broadcasts = await getBroadcasts(orgId);
    const filtered = broadcasts.filter((b) => b.id !== id);
    if (filtered.length === broadcasts.length) {
      return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
    }
    await saveBroadcasts(orgId, filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Broadcasts DELETE error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to delete broadcast" }, { status: 500 });
  }
});
