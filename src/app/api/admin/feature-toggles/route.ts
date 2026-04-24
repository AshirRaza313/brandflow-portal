import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";

export const GET = withAuth(async (_req: NextRequest, authCtx) => {
  logger.info("[Admin Feature Toggles] GET request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const settings = await db.systemSetting.findFirst({
      where: { key: "feature_toggles" },
    });

    const toggles = settings?.value ? JSON.parse(settings.value as string) : {
      lockedGrowth: [],
      lockedEnterprise: [],
    };

    return NextResponse.json(toggles);
  } catch (error: any) {
    console.error("Feature toggles GET error:", error?.message);
    return NextResponse.json({ lockedGrowth: [], lockedEnterprise: [] });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });

export const PUT = withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Feature Toggles] PUT request", { userId: authCtx.userId });
  try {
    await ensureDb();
    const body = await req.json();
    const { lockedGrowth, lockedEnterprise } = body;

    const value = JSON.stringify({
      lockedGrowth: Array.isArray(lockedGrowth) ? lockedGrowth : [],
      lockedEnterprise: Array.isArray(lockedEnterprise) ? lockedEnterprise : [],
    });

    await db.systemSetting.upsert({
      where: { key: "feature_toggles" },
      update: { value },
      create: { key: "feature_toggles", value, category: "system" },
    });

    return NextResponse.json({ success: true, lockedGrowth, lockedEnterprise });
  } catch (error: any) {
    console.error("Feature toggles PUT error:", error?.message);
    return NextResponse.json({ error: "Failed to save feature toggles" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false });
