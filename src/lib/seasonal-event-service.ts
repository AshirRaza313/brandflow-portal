import type { PrismaClient } from "@prisma/client";
import {
  addDaysToDateKey,
  dateKeyStartInTimeZone,
  getDateKeyInTimeZone,
  getNextScheduleTransition,
  resolveEventScheduleStatus,
  resolveRegionEventOccurrence,
  selectPrimaryActiveEvent,
} from "@/lib/event-scheduling";
import {
  buildSeasonalEventTheme,
  loadSeasonalEventRecords,
  type SeasonalEventRecord,
} from "@/lib/event-setting-store";
import { getEventsForRegion, type RegionEvent } from "@/lib/events-library";

type SeasonalEventClient = Pick<PrismaClient, "organization" | "systemSetting" | "$transaction">;

export interface SeasonalEventCatalog {
  country: string;
  religion: string;
  timezone: string;
  today: string;
  serverNow: string;
  nextTransitionAt: string | null;
  activeEventEndsAt: string | null;
  events: RegionEvent[];
  regionEvents: RegionEvent[];
  customEvents: RegionEvent[];
  activeEvents: RegionEvent[];
  activeEvent: RegionEvent | null;
}

function mergeRecordWithEvent(base: RegionEvent, record: SeasonalEventRecord | undefined): RegionEvent | null {
  if (record?.deleted) return null;
  const primary = record?.primaryColor || base.theme.primary;
  const secondary = record?.secondaryColor || base.theme.secondary;
  return {
    ...base,
    source: record?.source || base.source || "library",
    name: record?.name || base.name,
    description: record?.description ?? base.description,
    emoji: record?.emoji || base.emoji,
    category: record?.category || base.category,
    occurrenceDate: record?.occurrenceDate ?? base.occurrenceDate ?? null,
    saleStart: record?.saleStart ?? null,
    saleEnd: record?.saleEnd ?? null,
    activationMode: record?.activationMode || "automatic",
    manualActive: record?.manualActive || false,
    promotionalMessage: record?.promotionalMessage ?? base.promotionalMessage,
    theme: buildSeasonalEventTheme(primary, secondary),
    updatedAt: record?.updatedAt,
  };
}

function customEventFromRecord(record: SeasonalEventRecord): RegionEvent | null {
  if (record.source !== "custom" || record.deleted || !record.name || !record.emoji || !record.category) return null;
  return {
    id: record.id,
    source: "custom",
    name: record.name,
    description: record.description || "",
    date: record.occurrenceDate ? record.occurrenceDate.slice(5) : "dynamic",
    occurrenceDate: record.occurrenceDate,
    emoji: record.emoji,
    theme: buildSeasonalEventTheme(record.primaryColor, record.secondaryColor),
    isActive: true,
    autoDetectDaysBefore: 0,
    promotionalMessage: record.promotionalMessage,
    category: record.category,
    saleStart: record.saleStart,
    saleEnd: record.saleEnd,
    activationMode: record.activationMode,
    manualActive: record.manualActive,
    updatedAt: record.updatedAt,
  };
}

function resolveEvent(event: RegionEvent, today: string): RegionEvent {
  const occurrence = resolveRegionEventOccurrence(event, today);
  const scheduleStatus = resolveEventScheduleStatus(event, today);
  return {
    ...event,
    resolvedDate: occurrence.date,
    dateConfidence: occurrence.confidence,
    dateNote: occurrence.note,
    scheduled: scheduleStatus !== "unscheduled",
    scheduleStatus,
  };
}

export async function getSeasonalEventCatalog(
  client: SeasonalEventClient,
  organizationId: string,
  options: { country?: string; religion?: string; now?: Date } = {},
): Promise<SeasonalEventCatalog | null> {
  const now = options.now || new Date();
  const [organization, records] = await Promise.all([
    client.organization.findUnique({
      where: { id: organizationId },
      select: { country: true, religion: true, timezone: true },
    }),
    loadSeasonalEventRecords(client, organizationId, now),
  ]);
  if (!organization) return null;

  const country = options.country || organization.country || "";
  const religion = options.religion || organization.religion || "";
  const timezone = organization.timezone || "UTC";
  const today = getDateKeyInTimeZone(now, timezone);

  const regionEvents = getEventsForRegion(country, religion)
    .map((event) => mergeRecordWithEvent({ ...event, source: "library" }, records.get(event.id)))
    .filter((event): event is RegionEvent => event !== null)
    .map((event) => resolveEvent(event, today));

  const customEvents = [...records.values()]
    .map(customEventFromRecord)
    .filter((event): event is RegionEvent => event !== null)
    .map((event) => resolveEvent(event, today));

  const events = [...regionEvents, ...customEvents];
  const activeEvents = events.filter((event) => event.scheduleStatus === "active");
  const activeEvent = selectPrimaryActiveEvent(activeEvents);
  const activeEventEndsAt = activeEvent?.saleEnd
    ? dateKeyStartInTimeZone(addDaysToDateKey(activeEvent.saleEnd, 1), timezone)?.toISOString() || null
    : null;
  return {
    country,
    religion,
    timezone,
    today,
    serverNow: now.toISOString(),
    nextTransitionAt: getNextScheduleTransition(events, now, timezone),
    activeEventEndsAt,
    events,
    regionEvents,
    customEvents,
    activeEvents,
    activeEvent,
  };
}
