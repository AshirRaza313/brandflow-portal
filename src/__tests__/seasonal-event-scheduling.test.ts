import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  dateKeyStartInTimeZone,
  daysBetweenDateKeys,
  getDateKeyInTimeZone,
  getEventCountdownLabel,
  getNextScheduleTransition,
  isValidDateOnly,
  resolveEventScheduleStatus,
  resolveRegionEventOccurrence,
  selectPrimaryActiveEvent,
} from "@/lib/event-scheduling";
import type { RegionEvent } from "@/lib/events-library";

function event(overrides: Partial<RegionEvent> = {}): RegionEvent {
  return {
    id: "test-event",
    name: "Test Event",
    description: "A deterministic test event",
    date: "08-14",
    emoji: "*",
    theme: {
      primary: "#123456",
      secondary: "#abcdef",
      gradient: "linear-gradient(135deg, #123456, #abcdef)",
      bgPattern: "#12345614",
    },
    isActive: true,
    autoDetectDaysBefore: 7,
    promotionalMessage: "Seasonal offer",
    category: "cultural",
    source: "library",
    ...overrides,
  };
}

describe("seasonal event date helpers", () => {
  it("strictly validates and performs arithmetic on date-only values", () => {
    expect(isValidDateOnly("2028-02-29")).toBe(true);
    expect(isValidDateOnly("2026-02-29")).toBe(false);
    expect(isValidDateOnly("2026-13-01")).toBe(false);
    expect(isValidDateOnly("2026-8-03")).toBe(false);
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2028-03-01", -1)).toBe("2028-02-29");
    expect(daysBetweenDateKeys("2026-08-03", "2026-08-10")).toBe(7);
  });

  it("resolves annual weekday, Easter-relative, and retail dates for the correct year", () => {
    expect(resolveRegionEventOccurrence(event({ id: "us-mothers" }), "2026-01-01"))
      .toMatchObject({ date: "2026-05-10", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "us-fathers" }), "2026-01-01"))
      .toMatchObject({ date: "2026-06-21", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "gb-mothers" }), "2026-01-01"))
      .toMatchObject({ date: "2026-03-15", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "us-easter" }), "2026-01-01"))
      .toMatchObject({ date: "2026-04-05", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "us-thanksgiving" }), "2026-01-01"))
      .toMatchObject({ date: "2026-11-26", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "us-black-friday" }), "2026-01-01"))
      .toMatchObject({ date: "2026-11-27", confidence: "exact" });
  });

  it("treats New Year as January 1 and rolls fixed dates into the next year", () => {
    expect(resolveRegionEventOccurrence(event({ id: "pk-newyear", date: "12-31" }), "2026-12-31"))
      .toMatchObject({ date: "2027-01-01", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "pk-aug14", date: "08-14" }), "2026-08-15"))
      .toMatchObject({ date: "2027-08-14", confidence: "exact" });
  });

  it("uses persisted exact-date overrides and does not fabricate unsupported lunisolar dates", () => {
    expect(resolveRegionEventOccurrence(event({
      id: "custom-anniversary",
      source: "custom",
      occurrenceDate: "2026-09-12",
      date: "dynamic",
    }), "2026-08-01")).toEqual({ date: "2026-09-12", confidence: "exact" });

    expect(resolveRegionEventOccurrence(event({
      id: "pk-newyear",
      source: "library",
      occurrenceDate: "2026-12-31",
      date: "12-31",
    }), "2026-08-01")).toEqual({ date: "2026-12-31", confidence: "exact" });

    expect(resolveRegionEventOccurrence(event({ id: "in-diwali", date: "dynamic" }), "2026-01-01"))
      .toMatchObject({ date: "2026-11-08", confidence: "exact" });
    expect(resolveRegionEventOccurrence(event({ id: "in-diwali", date: "dynamic" }), "2026-11-09"))
      .toMatchObject({ date: null, confidence: "requires-confirmation" });
  });

  it("marks Islamic calendar results as estimates and explains moon-sighting variance", () => {
    const result = resolveRegionEventOccurrence(
      event({ id: "pk-ramadan", date: "dynamic", lunar: true }),
      "2026-01-01",
    );

    expect(result.date).toBe("2026-02-18");
    expect(result.confidence).toBe("estimated");
    expect(result.note).toMatch(/moon sighting/i);
  });
});

describe("seasonal event timezone and schedule state", () => {
  it("derives the brand-local date without relying on the server timezone", () => {
    const now = new Date("2026-08-03T19:30:00.000Z");
    expect(getDateKeyInTimeZone(now, "Asia/Karachi")).toBe("2026-08-04");
    expect(getDateKeyInTimeZone(now, "America/New_York")).toBe("2026-08-03");
    expect(getDateKeyInTimeZone(now, "Not/A_Timezone")).toBe("2026-08-03");
    expect(dateKeyStartInTimeZone("2026-08-04", "Asia/Karachi")?.toISOString())
      .toBe("2026-08-03T19:00:00.000Z");
  });

  it("distinguishes unscheduled, upcoming, automatic, paused, manual, and ended sales", () => {
    expect(resolveEventScheduleStatus({ saleStart: null, saleEnd: null }, "2026-08-03"))
      .toBe("unscheduled");
    expect(resolveEventScheduleStatus({ saleStart: "2026-08-05", saleEnd: "2026-08-10" }, "2026-08-03"))
      .toBe("upcoming");
    expect(resolveEventScheduleStatus({ saleStart: "2026-08-01", saleEnd: "2026-08-10", activationMode: "automatic" }, "2026-08-03"))
      .toBe("active");
    expect(resolveEventScheduleStatus({ saleStart: "2026-08-01", saleEnd: "2026-08-10", activationMode: "manual", manualActive: false }, "2026-08-03"))
      .toBe("paused");
    expect(resolveEventScheduleStatus({ saleStart: "2026-08-01", saleEnd: "2026-08-10", activationMode: "manual", manualActive: true }, "2026-08-03"))
      .toBe("active");
    expect(resolveEventScheduleStatus({ saleStart: "2026-07-01", saleEnd: "2026-07-31" }, "2026-08-03"))
      .toBe("ended");
    expect(resolveEventScheduleStatus({ saleStart: "2026-08-10", saleEnd: "2026-08-01" }, "2026-08-03"))
      .toBe("unscheduled");
  });

  it("returns truthful countdown labels for the current schedule state", () => {
    expect(getEventCountdownLabel(event({ saleStart: "2026-08-04", saleEnd: "2026-08-10", scheduleStatus: "upcoming" }), "2026-08-03"))
      .toBe("Starts tomorrow");
    expect(getEventCountdownLabel(event({ saleStart: "2026-08-01", saleEnd: "2026-08-03", scheduleStatus: "active" }), "2026-08-03"))
      .toBe("Ends today");
    expect(getEventCountdownLabel(event({ saleStart: "2026-07-01", saleEnd: "2026-08-01", scheduleStatus: "ended" }), "2026-08-03"))
      .toBe("Ended 2 days ago");
    expect(getEventCountdownLabel(event({ scheduleStatus: "paused" }), "2026-08-03"))
      .toBe("Paused");
  });

  it("calculates the next automatic start or active end at the brand's midnight", () => {
    const now = new Date("2026-08-03T18:00:00.000Z");
    const events = [
      event({
        id: "starts-tomorrow",
        saleStart: "2026-08-04",
        saleEnd: "2026-08-10",
        activationMode: "automatic",
        scheduleStatus: "upcoming",
      }),
      event({
        id: "ends-today",
        saleStart: "2026-08-01",
        saleEnd: "2026-08-03",
        activationMode: "automatic",
        scheduleStatus: "active",
      }),
      event({
        id: "manual-upcoming",
        saleStart: "2026-08-04",
        saleEnd: "2026-08-05",
        activationMode: "manual",
        manualActive: false,
        scheduleStatus: "upcoming",
      }),
    ];

    expect(getNextScheduleTransition(events, now, "Asia/Karachi"))
      .toBe("2026-08-03T19:00:00.000Z");
    expect(getNextScheduleTransition([events[2]], now, "Asia/Karachi"))
      .toBe("2026-08-03T19:00:00.000Z");
    expect(getNextScheduleTransition([
      event({
        saleStart: "2026-08-01",
        saleEnd: "2026-08-05",
        activationMode: "manual",
        manualActive: false,
        scheduleStatus: "paused",
      }),
    ], now, "Asia/Karachi")).toBeNull();
  });
});

describe("primary seasonal event selection", () => {
  it("selects only active events, preferring manual activation then the latest update", () => {
    const selected = selectPrimaryActiveEvent([
      event({ id: "automatic", scheduleStatus: "active", updatedAt: "2026-08-03T12:00:00.000Z" }),
      event({ id: "newer-manual", scheduleStatus: "active", manualActive: true, updatedAt: "2026-08-03T11:00:00.000Z" }),
      event({ id: "older-manual", scheduleStatus: "active", manualActive: true, updatedAt: "2026-08-03T10:00:00.000Z" }),
      event({ id: "paused", scheduleStatus: "paused", manualActive: true, updatedAt: "2026-08-03T13:00:00.000Z" }),
    ]);

    expect(selected?.id).toBe("newer-manual");
    expect(selectPrimaryActiveEvent([event({ scheduleStatus: "ended" })])).toBeNull();
  });
});
