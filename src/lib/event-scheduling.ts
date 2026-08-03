import type {
  EventDateConfidence,
  EventScheduleStatus,
  RegionEvent,
} from "@/lib/events-library";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MM_DD = /^(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export interface ResolvedEventOccurrence {
  date: string | null;
  confidence: EventDateConfidence;
  note?: string;
}

const ISLAMIC_EVENT_DATES: Array<{ match: RegExp; month: number; day: number }> = [
  { match: /(?:^|-)eid-(?:ul-)?fitr$|eid-fitr/, month: 10, day: 1 },
  { match: /(?:^|-)eid-(?:ul-)?adha$|eid-adha/, month: 12, day: 10 },
  { match: /shab-barat/, month: 8, day: 15 },
  { match: /shab-qadr/, month: 9, day: 27 },
  { match: /milad(?:-un)?-nabi/, month: 3, day: 12 },
  { match: /shab-meraj/, month: 7, day: 27 },
  { match: /ramadan/, month: 9, day: 1 },
];

const INDIA_ANNUAL_DATES: Record<string, Record<number, string>> = {
  "in-holi": { 2026: "2026-03-04" },
  "in-ganesh": { 2026: "2026-09-14" },
  "in-navratri": { 2026: "2026-10-11" },
  "in-dussehra": { 2026: "2026-10-20" },
  "in-diwali": { 2026: "2026-11-08" },
};

function utcDateFromKey(value: string): Date | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function isValidDateOnly(value: unknown): value is string {
  return typeof value === "string" && utcDateFromKey(value) !== null;
}

export function formatDateOnly(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function addDaysToDateKey(value: string, days: number): string {
  const date = utcDateFromKey(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function daysBetweenDateKeys(from: string, to: string): number {
  const fromDate = utcDateFromKey(from);
  const toDate = utcDateFromKey(to);
  if (!fromDate || !toDate) return 0;
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

export function getDateKeyInTimeZone(now: Date, timeZone = "UTC"): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const values = Object.fromEntries(
    formatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const day = 1 + ((7 + weekday - first.getUTCDay()) % 7) + (nth - 1) * 7;
  return formatDateOnly(new Date(Date.UTC(year, month - 1, day)));
}

function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatDateOnly(new Date(Date.UTC(year, month - 1, day)));
}

function thanksgiving(year: number): string {
  return nthWeekdayOfMonth(year, 11, 4, 4);
}

function islamicDateParts(date: Date): { month: number; day: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      timeZone: "UTC",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    return Number.isFinite(month) && Number.isFinite(day) ? { month, day } : null;
  } catch {
    return null;
  }
}

function findNextIslamicOccurrence(
  referenceDate: string,
  hijriMonth: number,
  hijriDay: number,
): string | null {
  const start = utcDateFromKey(referenceDate);
  if (!start) return null;
  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = new Date(start.getTime() + offset * DAY_MS + 12 * 60 * 60 * 1000);
    const parts = islamicDateParts(candidate);
    if (parts?.month === hijriMonth && parts.day === hijriDay) {
      return formatDateOnly(candidate);
    }
  }
  return null;
}

function resolveForYear(event: RegionEvent, year: number): ResolvedEventOccurrence {
  const id = event.id.toLocaleLowerCase("en-US");

  if (id.includes("newyear")) {
    return { date: `${year}-01-01`, confidence: "exact" };
  }
  if (id.includes("mothers")) {
    if (id.startsWith("gb-")) {
      return { date: addDaysToDateKey(easterSunday(year), -21), confidence: "exact" };
    }
    return { date: nthWeekdayOfMonth(year, 5, 0, 2), confidence: "exact" };
  }
  if (id.includes("fathers")) {
    return { date: nthWeekdayOfMonth(year, 6, 0, 3), confidence: "exact" };
  }
  if (id.includes("thanksgiving")) {
    return { date: thanksgiving(year), confidence: "exact" };
  }
  if (id.includes("black-friday") || id.includes("white-friday")) {
    return { date: addDaysToDateKey(thanksgiving(year), 1), confidence: "exact" };
  }
  if (id.includes("easter")) {
    return { date: easterSunday(year), confidence: "exact" };
  }

  const annualDates = INDIA_ANNUAL_DATES[id];
  if (annualDates) {
    return annualDates[year]
      ? { date: annualDates[year], confidence: "exact" }
      : {
          date: null,
          confidence: "requires-confirmation",
          note: "This lunisolar date needs an annual calendar confirmation.",
        };
  }

  if (event.date !== "dynamic") {
    const match = MM_DD.exec(event.date);
    if (!match) return { date: null, confidence: "requires-confirmation" };
    const date = `${year}-${match[1]}-${match[2]}`;
    return isValidDateOnly(date)
      ? { date, confidence: "exact" }
      : { date: null, confidence: "requires-confirmation" };
  }

  return { date: null, confidence: "requires-confirmation" };
}

export function resolveRegionEventOccurrence(
  event: RegionEvent,
  referenceDate: string,
): ResolvedEventOccurrence {
  // A saved occurrence is an explicit organization-level override. Honour it
  // for library events as well as custom events instead of recalculating it.
  if (isValidDateOnly(event.occurrenceDate)) {
    return { date: event.occurrenceDate, confidence: "exact" };
  }

  const id = event.id.toLocaleLowerCase("en-US");
  const islamicRule = event.date === "dynamic"
    ? ISLAMIC_EVENT_DATES.find((rule) => rule.match.test(id))
    : undefined;
  if (islamicRule) {
    const date = findNextIslamicOccurrence(referenceDate, islamicRule.month, islamicRule.day);
    return date
      ? {
          date,
          confidence: "estimated",
          note: "Estimated using the Umm al-Qura calendar; local moon sighting may vary by one day.",
        }
      : { date: null, confidence: "requires-confirmation" };
  }

  const referenceYear = Number(referenceDate.slice(0, 4));
  const thisYear = resolveForYear(event, referenceYear);
  if (thisYear.date && thisYear.date >= referenceDate) return thisYear;
  const nextYear = resolveForYear(event, referenceYear + 1);
  if (nextYear.date) return nextYear;
  return nextYear.confidence === "requires-confirmation" ? nextYear : thisYear;
}

export function resolveEventScheduleStatus(
  event: Pick<RegionEvent, "saleStart" | "saleEnd" | "activationMode" | "manualActive">,
  today: string,
): EventScheduleStatus {
  if (!isValidDateOnly(event.saleStart) || !isValidDateOnly(event.saleEnd)) return "unscheduled";
  if (event.saleStart > event.saleEnd) return "unscheduled";
  if (today > event.saleEnd) return "ended";
  if (today < event.saleStart) return "upcoming";
  if (event.activationMode === "manual") return event.manualActive ? "active" : "paused";
  return "active";
}

export function getEventCountdownLabel(event: RegionEvent, today: string): string {
  const status = event.scheduleStatus || resolveEventScheduleStatus(event, today);
  if (status === "active" && event.saleEnd) {
    const days = daysBetweenDateKeys(today, event.saleEnd);
    return days === 0 ? "Ends today" : `Ends in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (status === "upcoming" && event.saleStart) {
    const days = daysBetweenDateKeys(today, event.saleStart);
    if (days === 0) return "Starts today";
    if (days === 1) return "Starts tomorrow";
    return `Starts in ${days} days`;
  }
  if (status === "ended" && event.saleEnd) {
    const days = Math.abs(daysBetweenDateKeys(today, event.saleEnd));
    return days === 0 ? "Ended today" : `Ended ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (status === "paused") return "Paused";
  if (!event.resolvedDate) return "Date requires confirmation";
  const days = daysBetweenDateKeys(today, event.resolvedDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

function getTimeZoneParts(date: Date, timeZone: string): Record<string, string> {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    return getTimeZoneParts(date, "UTC");
  }
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function dateKeyStartInTimeZone(dateKey: string, timeZone = "UTC"): Date | null {
  const desired = utcDateFromKey(dateKey);
  if (!desired) return null;
  let guess = desired.getTime();
  const desiredAsUtc = Date.UTC(
    desired.getUTCFullYear(),
    desired.getUTCMonth(),
    desired.getUTCDate(),
  );
  for (let index = 0; index < 3; index += 1) {
    const parts = getTimeZoneParts(new Date(guess), timeZone || "UTC");
    const actualAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess += desiredAsUtc - actualAsUtc;
  }
  return new Date(guess);
}

export function getNextScheduleTransition(
  events: RegionEvent[],
  now: Date,
  timeZone: string,
): string | null {
  const today = getDateKeyInTimeZone(now, timeZone);
  const candidates: number[] = [];
  for (const event of events) {
    if (!isValidDateOnly(event.saleStart) || !isValidDateOnly(event.saleEnd)) continue;
    const status = event.scheduleStatus || resolveEventScheduleStatus(event, today);
    if (status === "upcoming") {
      const start = dateKeyStartInTimeZone(event.saleStart, timeZone);
      if (start && start.getTime() > now.getTime()) candidates.push(start.getTime());
    }
    if (status === "active") {
      const end = dateKeyStartInTimeZone(addDaysToDateKey(event.saleEnd, 1), timeZone);
      if (end && end.getTime() > now.getTime()) candidates.push(end.getTime());
    }
  }
  return candidates.length > 0 ? new Date(Math.min(...candidates)).toISOString() : null;
}

export function selectPrimaryActiveEvent(events: RegionEvent[]): RegionEvent | null {
  return [...events]
    .filter((event) => event.scheduleStatus === "active")
    .sort((left, right) => {
      const manualDifference = Number(Boolean(right.manualActive)) - Number(Boolean(left.manualActive));
      if (manualDifference !== 0) return manualDifference;
      const updatedDifference = String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
      if (updatedDifference !== 0) return updatedDifference;
      return left.id.localeCompare(right.id);
    })[0] || null;
}
