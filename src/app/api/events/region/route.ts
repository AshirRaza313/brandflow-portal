import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth, type AuthContext } from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validations/api";
import logger from "@/lib/logger";
import { isValidDateOnly } from "@/lib/event-scheduling";
import {
  createSeasonalEventId,
  migrateLegacySeasonalEvents,
  saveSeasonalEventRecord,
  SEASONAL_EVENT_RECORD_VERSION,
  type SeasonalEventRecord,
} from "@/lib/event-setting-store";
import { getSeasonalEventCatalog } from "@/lib/seasonal-event-service";
import { resolveSeasonalEventAccess, type SeasonalEventAccess } from "@/lib/seasonal-event-access";
import type { RegionEvent } from "@/lib/events-library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const categorySchema = z.enum(["religious", "cultural", "national", "commercial"]);
const dateSchema = z.string().refine(isValidDateOnly, "Use a valid YYYY-MM-DD date");
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color");
const activationModeSchema = z.enum(["automatic", "manual"]);

const scheduleFields = {
  saleStart: dateSchema,
  saleEnd: dateSchema,
  activationMode: activationModeSchema.default("automatic"),
  manualActive: z.boolean().default(false),
  promotionalMessage: z.string().trim().max(240).default(""),
  primaryColor: colorSchema.default("#D4A73A"),
  secondaryColor: colorSchema.default("#F59E0B"),
};

const createEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required").max(100),
  description: z.string().trim().max(500).default(""),
  emoji: z.string().trim().min(1).max(16).default("🎉"),
  category: categorySchema.default("cultural"),
  occurrenceDate: dateSchema,
  ...scheduleFields,
}).superRefine((data, ctx) => {
  if (data.saleStart > data.saleEnd) {
    ctx.addIssue({ code: "custom", path: ["saleEnd"], message: "Sale end must be on or after sale start" });
  }
});

const updateEventSchema = z.object({
  id: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  emoji: z.string().trim().min(1).max(16).optional(),
  category: categorySchema.optional(),
  occurrenceDate: dateSchema.optional(),
  ...scheduleFields,
}).superRefine((data, ctx) => {
  if (data.saleStart > data.saleEnd) {
    ctx.addIssue({ code: "custom", path: ["saleEnd"], message: "Sale end must be on or after sale start" });
  }
});

const deleteEventSchema = z.object({ id: z.string().trim().min(1).max(160) });

function withPrivateNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function json(data: Record<string, unknown>, status = 200): NextResponse {
  return withPrivateNoStore(NextResponse.json(data, { status }));
}

async function accessOrResponse(
  authCtx: AuthContext,
  requireMutation = false,
): Promise<SeasonalEventAccess | NextResponse> {
  if (!authCtx.organizationId) {
    return json({ error: "Select an organization before managing seasonal events." }, 403);
  }
  const access = await withRetry(() => resolveSeasonalEventAccess(db, authCtx), 2, 500);
  if (!access) {
    return json({ error: "You are no longer a member of this organization." }, 403);
  }
  if (!access.canReadMarketing) {
    return json({ error: "You do not have access to Marketing." }, 403);
  }
  if (requireMutation && !access.canManageMarketing) {
    return json({ error: "Your Marketing access is read-only." }, 403);
  }
  return access;
}

function toRecord(
  id: string,
  source: "library" | "custom",
  data: z.infer<typeof createEventSchema> | z.infer<typeof updateEventSchema>,
  existing: Partial<RegionEvent>,
  now: string,
): SeasonalEventRecord {
  const event = existing;
  return {
    version: SEASONAL_EVENT_RECORD_VERSION,
    id,
    source,
    name: data.name || event.name,
    description: data.description ?? event.description ?? "",
    emoji: data.emoji || event.emoji,
    category: data.category || event.category,
    occurrenceDate: data.occurrenceDate || event.occurrenceDate || event.resolvedDate || null,
    saleStart: data.saleStart,
    saleEnd: data.saleEnd,
    activationMode: data.activationMode,
    manualActive: data.activationMode === "manual" ? data.manualActive : false,
    promotionalMessage: data.promotionalMessage,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const GET = withRateLimit(withAuth(async (req, authCtx) => {
  try {
    const access = await accessOrResponse(authCtx);
    if (access instanceof NextResponse) return access;
    const organizationId = access.organizationId;
    const { searchParams } = new URL(req.url);
    const catalog = await withRetry(() => getSeasonalEventCatalog(db, organizationId, {
      country: searchParams.get("country") || undefined,
      religion: searchParams.get("religion") || undefined,
    }), 2, 500);
    if (!catalog) return json({ error: "Organization not found" }, 404);
    return json({
      ...catalog,
      customCount: catalog.customEvents.length,
      regionCount: catalog.regionEvents.length,
    });
  } catch (error: unknown) {
    logger.error("Events region GET error", error, { organizationId: authCtx.organizationId });
    if (isDbUnavailable(error)) return withPrivateNoStore(dbErrorResponse(error));
    return json({ error: "Failed to fetch events" }, 500);
  }
}), { maxRequests: 60, windowSeconds: 60 });

export const POST = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const access = await accessOrResponse(authCtx, true);
    if (access instanceof NextResponse) return access;
    const organizationId = access.organizationId;
    const result = await validateBody(req, createEventSchema);
    if (!result.success) return withPrivateNoStore(result.response);
    const now = new Date();
    await migrateLegacySeasonalEvents(db, organizationId, now);
    const id = createSeasonalEventId();
    const record = toRecord(id, "custom", result.data, {}, now.toISOString());
    await withRetry(() => saveSeasonalEventRecord(db, organizationId, record), 2, 500);
    const catalog = await getSeasonalEventCatalog(db, organizationId, { now });
    const event = catalog?.customEvents.find((item) => item.id === id);
    return json({ event, activeEvent: catalog?.activeEvent || null }, 201);
  } catch (error: unknown) {
    logger.error("Events region POST error", error, { organizationId: authCtx.organizationId });
    if (isDbUnavailable(error)) return withPrivateNoStore(dbErrorResponse(error));
    return json({ error: "Failed to create custom event" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });

export const PATCH = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const access = await accessOrResponse(authCtx, true);
    if (access instanceof NextResponse) return access;
    const organizationId = access.organizationId;
    const result = await validateBody(req, updateEventSchema);
    if (!result.success) return withPrivateNoStore(result.response);
    const now = new Date();
    await migrateLegacySeasonalEvents(db, organizationId, now);
    const catalog = await getSeasonalEventCatalog(db, organizationId, { now });
    const event = catalog?.events.find((item) => item.id === result.data.id);
    if (!event) return json({ error: "Seasonal event not found" }, 404);
    const source = event.source === "custom" ? "custom" : "library";
    const record = toRecord(event.id, source, result.data, event, now.toISOString());
    await withRetry(() => saveSeasonalEventRecord(db, organizationId, record), 2, 500);
    const refreshed = await getSeasonalEventCatalog(db, organizationId, { now });
    return json({
      event: refreshed?.events.find((item) => item.id === event.id),
      activeEvent: refreshed?.activeEvent || null,
    });
  } catch (error: unknown) {
    logger.error("Events region PATCH error", error, { organizationId: authCtx.organizationId });
    if (isDbUnavailable(error)) return withPrivateNoStore(dbErrorResponse(error));
    return json({ error: "Failed to update seasonal event" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });

export const DELETE = withRateLimit(withAuth(async (req: NextRequest, authCtx) => {
  try {
    const access = await accessOrResponse(authCtx, true);
    if (access instanceof NextResponse) return access;
    const organizationId = access.organizationId;
    const result = await validateBody(req, deleteEventSchema);
    if (!result.success) return withPrivateNoStore(result.response);
    const now = new Date();
    await migrateLegacySeasonalEvents(db, organizationId, now);
    const catalog = await getSeasonalEventCatalog(db, organizationId, { now });
    const event = catalog?.customEvents.find((item) => item.id === result.data.id);
    if (!event) return json({ error: "Custom event not found" }, 404);
    const tombstone: SeasonalEventRecord = {
      version: SEASONAL_EVENT_RECORD_VERSION,
      id: event.id,
      source: "custom",
      occurrenceDate: null,
      saleStart: null,
      saleEnd: null,
      activationMode: "manual",
      manualActive: false,
      promotionalMessage: "",
      primaryColor: "#D4A73A",
      secondaryColor: "#F59E0B",
      deleted: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await withRetry(() => saveSeasonalEventRecord(db, organizationId, tombstone), 2, 500);
    const refreshed = await getSeasonalEventCatalog(db, organizationId, { now });
    return json({ success: true, activeEvent: refreshed?.activeEvent || null });
  } catch (error: unknown) {
    logger.error("Events region DELETE error", error, { organizationId: authCtx.organizationId });
    if (isDbUnavailable(error)) return withPrivateNoStore(dbErrorResponse(error));
    return json({ error: "Failed to delete custom event" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });
