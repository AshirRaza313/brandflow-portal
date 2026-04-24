import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb, dbErrorResponse } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

const GUIDE_KEY = "user_guide_content";

// GET /api/admin/guide — Return guide content (admin only)
// SECURITY: If DB has corrupt/empty guide data, auto-delete it and return null
// so the client falls back to its built-in DEFAULT_GUIDE
export const GET = withAuth(async (_req: NextRequest, authCtx) => {
  logger.info("[Admin Guide] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const setting = await db.systemSetting.findUnique({ where: { key: GUIDE_KEY } });
    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        // Validate structure: must have tabs array with items
        if (
          parsed &&
          Array.isArray(parsed.tabs) &&
          parsed.tabs.length > 0 &&
          parsed.tabs.every((t: any) => Array.isArray(t.items) && t.items.length > 0)
        ) {
          return NextResponse.json({ content: parsed, source: "db" });
        }
        // CORRUPT DATA: Delete it so client uses defaults
        console.warn("[Guide API] Found corrupt guide data in DB, auto-deleting");
        await db.systemSetting.delete({ where: { key: GUIDE_KEY } }).catch(() => {});
        return NextResponse.json({ content: null, source: "defaults", corruptDeleted: true });
      } catch {
        // JSON parse failed — data is corrupted, delete it
        console.warn("[Guide API] Guide data JSON parse failed, auto-deleting");
        await db.systemSetting.delete({ where: { key: GUIDE_KEY } }).catch(() => {});
        return NextResponse.json({ content: null, source: "defaults", corruptDeleted: true });
      }
    }
    return NextResponse.json({ content: null, source: "defaults" });
  } catch (error: any) {
    console.error("Fetch guide error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    // On any error, return null content so client uses DEFAULT_GUIDE
    return NextResponse.json({ content: null, source: "defaults" });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

// PUT /api/admin/guide — Save guide content (admin only)
export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Guide] PUT request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const body = await req.json();
    const { content } = body;

    // Validate content before saving
    if (!content || !Array.isArray(content.tabs) || content.tabs.length === 0) {
      return NextResponse.json({ error: "Guide content must have at least one tab with items" }, { status: 400 });
    }

    const jsonValue = JSON.stringify(content);

    const existing = await db.systemSetting.findUnique({ where: { key: GUIDE_KEY } });

    if (existing) {
      await db.systemSetting.update({
        where: { key: GUIDE_KEY },
        data: { value: jsonValue, category: "guide" },
      });
    } else {
      await db.systemSetting.create({
        data: { key: GUIDE_KEY, value: jsonValue, category: "guide" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save guide error:", error?.message || error);
    if (error?.message?.includes("DATABASE_URL") || error?.message?.includes("Database connection")) {
      return dbErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to save guide" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
