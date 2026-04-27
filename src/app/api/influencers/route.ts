import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { sanitizeObject } from "@/lib/sanitize";
import logger from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Influencers API
// Stores influencer records in SystemSetting with key: "influencers-{orgId}"
// ─────────────────────────────────────────────────────────────────────────────

interface Influencer {
  id: string;
  name: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter";
  handle: string;
  followers: number;
  tier: "nano" | "micro" | "mid" | "macro" | "mega";
  status: "active" | "paused" | "completed";
  collaborationType: "barter" | "paid" | "affiliate" | "gifting";
  compensation: number;
  campaign: string;
  deliverables: string;
  reach: number;
  engagement: number;
  conversions: number;
  roi: number;
  notes: string;
  addedAt: string;
}

// GET: Retrieve influencers for an organization
export const GET = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Influencers] GET request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const orgId = authCtx.organizationId!;

    const setting = await db.systemSetting.findUnique({
      where: { key: `influencers-${orgId}` },
    });

    const influencers: Influencer[] = setting ? JSON.parse(setting.value) : [];

    return NextResponse.json({ influencers, orgId });
  } catch (error: any) {
    logger.error("[Influencers] GET error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to fetch influencers" }, { status: 500 });
  }
});

// POST: Create a new influencer
export const POST = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Influencers] POST request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const {
      name, platform, handle, followers, tier, status,
      collaborationType, compensation, campaign, deliverables,
      reach, engagement, conversions, roi, notes,
    } = body;

    if (!name || !platform || !handle) {
      return NextResponse.json({ error: "name, platform, and handle are required" }, { status: 400 });
    }

    // Auto-detect tier from follower count if not provided
    const autoTier = tier || getTierFromFollowers(followers || 0);

    const newInfluencer: Influencer = {
      id: `inf-${Date.now()}`,
      name,
      platform: platform || "instagram",
      handle,
      followers: followers || 0,
      tier: autoTier,
      status: status || "active",
      collaborationType: collaborationType || "barter",
      compensation: compensation || 0,
      campaign: campaign || "",
      deliverables: deliverables || "",
      reach: reach || 0,
      engagement: engagement || 0,
      conversions: conversions || 0,
      roi: roi || 0,
      notes: notes || "",
      addedAt: new Date().toISOString(),
    };

    const setting = await db.systemSetting.findUnique({
      where: { key: `influencers-${orgId}` },
    });

    const existing: Influencer[] = setting ? JSON.parse(setting.value) : [];
    existing.push(newInfluencer);

    await db.systemSetting.upsert({
      where: { key: `influencers-${orgId}` },
      create: { key: `influencers-${orgId}`, value: JSON.stringify(existing), category: "marketing" },
      update: { value: JSON.stringify(existing) },
    });

    return NextResponse.json({ influencer: newInfluencer, influencers: existing }, { status: 201 });
  } catch (error: any) {
    logger.error("[Influencers] POST error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to create influencer" }, { status: 500 });
  }
});

// PUT: Update an influencer or delete by id
export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  try {
    logger.info("[Influencers] PUT request", { userId: authCtx.userId, orgId: authCtx.organizationId });
    await ensureDb();
    const body = await req.json();
    Object.assign(body, sanitizeObject(body));
    const orgId = authCtx.organizationId!;

    const { id, _delete, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Influencer id is required" }, { status: 400 });
    }

    const setting = await db.systemSetting.findUnique({
      where: { key: `influencers-${orgId}` },
    });

    if (!setting) {
      return NextResponse.json({ error: "No influencers found" }, { status: 404 });
    }

    let influencers: Influencer[] = JSON.parse(setting.value);

    if (_delete) {
      influencers = influencers.filter((inf) => inf.id !== id);
    } else {
      const index = influencers.findIndex((inf) => inf.id === id);
      if (index === -1) {
        return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
      }
      influencers[index] = { ...influencers[index], ...updates, id };

      // Auto-recalculate tier if followers changed
      if (updates.followers !== undefined) {
        influencers[index].tier = getTierFromFollowers(updates.followers);
      }
      // Auto-calculate ROI
      if (updates.compensation !== undefined || updates.conversions !== undefined) {
        const comp = updates.compensation !== undefined ? updates.compensation : influencers[index].compensation;
        const conv = updates.conversions !== undefined ? updates.conversions : influencers[index].conversions;
        if (comp > 0) {
          influencers[index].roi = Math.round((conv * 50 / comp) * 100) / 100;
        }
      }
    }

    await db.systemSetting.update({
      where: { key: `influencers-${orgId}` },
      data: { value: JSON.stringify(influencers) },
    });

    return NextResponse.json({ influencers });
  } catch (error: any) {
    logger.error("[Influencers] PUT error", error, { orgId: authCtx?.organizationId });
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to update influencer" }, { status: 500 });
  }
});

function getTierFromFollowers(followers: number): "nano" | "micro" | "mid" | "macro" | "mega" {
  if (followers >= 1000000) return "mega";
  if (followers >= 500000) return "macro";
  if (followers >= 50000) return "mid";
  if (followers >= 10000) return "micro";
  return "nano";
}
