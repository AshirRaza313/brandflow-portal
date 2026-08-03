import { NextResponse } from "next/server";
import { db, dbErrorResponse, isDbUnavailable, withRetry } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { getSeasonalEventCatalog } from "@/lib/seasonal-event-service";
import { resolveSeasonalEventAccess } from "@/lib/seasonal-event-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function withPrivateNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function json(data: Record<string, unknown>, status = 200): NextResponse {
  return withPrivateNoStore(NextResponse.json(data, { status }));
}

export const GET = withRateLimit(withAuth(async (_req, authCtx) => {
  const organizationId = authCtx.organizationId;
  if (!organizationId) return json({ error: "Organization required" }, 403);
  try {
    const access = await withRetry(
      () => resolveSeasonalEventAccess(db, authCtx),
      2,
      500,
    );
    if (!access) return json({ error: "You are no longer a member of this organization." }, 403);
    const catalog = await withRetry(
      () => getSeasonalEventCatalog(db, access.organizationId),
      2,
      500,
    );
    if (!catalog) return json({ error: "Organization not found" }, 404);
    return json({
      activeEvent: catalog.activeEvent,
      serverNow: catalog.serverNow,
      nextTransitionAt: catalog.nextTransitionAt,
      activeEventEndsAt: catalog.activeEventEndsAt,
      timezone: catalog.timezone,
    });
  } catch (error: unknown) {
    logger.error("Active seasonal event GET error", error, { organizationId });
    if (isDbUnavailable(error)) return withPrivateNoStore(dbErrorResponse(error));
    return json({ error: "Failed to load active seasonal event" }, 500);
  }
}), { maxRequests: 30, windowSeconds: 60 });
