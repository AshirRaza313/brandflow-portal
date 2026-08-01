import { NextRequest, NextResponse } from "next/server";
import { db, withRetry} from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import logger from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { isCalendlyHttpsUrl } from "@/lib/calendly";

// ═══════════════════════════════════════════════════════════════════════════
//  Calendly Settings - stored in SystemSetting table as JSON
// ═══════════════════════════════════════════════════════════════════════════

const CALENDLY_KEY = "calendly_settings";

const DEFAULT_CALENDLY_SETTINGS = {
  enabled: false,
  calendlyUrl: "",
  widgetHeight: 630,
};

/**
 * GET - Fetch Calendly settings
 */
export const GET = withRateLimit(withAuth(async (_req: NextRequest, authCtx) => {
  logger.info("[Admin Calendly] GET request", { userId: authCtx.userId });

  try {
    const setting = await withRetry(async () => {
      return await db.systemSetting.findFirst({
      where: { key: CALENDLY_KEY },
    })
    }, 2, 500);

    const settings = setting?.value ? JSON.parse(setting.value as string) : DEFAULT_CALENDLY_SETTINGS;

    return NextResponse.json(settings);
  } catch (error: unknown) {
    logger.error("Calendly settings GET error:", error);
    return NextResponse.json(DEFAULT_CALENDLY_SETTINGS);
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false }), { maxRequests: 20, windowSeconds: 60 });

/**
 * PUT - Save Calendly settings
 */
export const PUT = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  logger.info("[Admin Calendly] PUT request", { userId: authCtx.userId });

  try {
    const body = await req.json();
    const enabled = Boolean(body.enabled);
    const calendlyUrl = typeof body.calendlyUrl === "string" ? body.calendlyUrl.trim() : "";

    if (enabled && !calendlyUrl) {
      return NextResponse.json(
        { error: "A Calendly scheduling URL is required when the widget is enabled" },
        { status: 400 },
      );
    }

    if (calendlyUrl && !isCalendlyHttpsUrl(calendlyUrl)) {
      return NextResponse.json(
        { error: "Enter a valid HTTPS Calendly event URL" },
        { status: 400 },
      );
    }

    const settings = {
      enabled,
      calendlyUrl,
      widgetHeight: typeof body.widgetHeight === "number" ? Math.min(1000, Math.max(300, body.widgetHeight)) : 630,
    };

    const value = JSON.stringify(settings);

    await withRetry(async () => {
      return await db.systemSetting.upsert({
      where: { key: CALENDLY_KEY },
      update: { value },
      create: { key: CALENDLY_KEY, value, category: "system" },
    })
    }, 2, 500);

    return NextResponse.json({ success: true, ...settings });
  } catch (error: unknown) {
    logger.error("Calendly settings PUT error:", error);
    return NextResponse.json({ error: "Failed to save Calendly settings" }, { status: 500 });
  }
}, { requireRole: ["admin", "owner", "platform_owner", "platform_admin"], requireOrg: false }), { maxRequests: 20, windowSeconds: 60 });
