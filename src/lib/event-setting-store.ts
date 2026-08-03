import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { RegionEvent } from "@/lib/events-library";
import { isValidDateOnly } from "@/lib/event-scheduling";

export const SEASONAL_EVENT_RECORD_VERSION = 1;
export const SEASONAL_EVENT_SETTING_TYPE = "seasonal-event";

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color");
const optionalDateSchema = z.string().refine(isValidDateOnly, "Use a valid YYYY-MM-DD date").nullable();

export const seasonalEventRecordSchema = z.object({
  version: z.literal(SEASONAL_EVENT_RECORD_VERSION),
  id: z.string().min(1).max(160),
  source: z.enum(["library", "custom"]),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  emoji: z.string().trim().min(1).max(16).optional(),
  category: z.enum(["religious", "cultural", "national", "commercial"]).optional(),
  occurrenceDate: optionalDateSchema.optional().default(null),
  saleStart: optionalDateSchema.optional().default(null),
  saleEnd: optionalDateSchema.optional().default(null),
  activationMode: z.enum(["automatic", "manual"]).default("automatic"),
  manualActive: z.boolean().default(false),
  promotionalMessage: z.string().trim().max(240).default(""),
  primaryColor: hexColorSchema.default("#D4A73A"),
  secondaryColor: hexColorSchema.default("#F59E0B"),
  deleted: z.boolean().optional().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((record, ctx) => {
  if (record.source === "custom" && !record.deleted) {
    if (!record.name) ctx.addIssue({ code: "custom", path: ["name"], message: "Custom event name is required" });
    if (!record.emoji) ctx.addIssue({ code: "custom", path: ["emoji"], message: "Custom event emoji is required" });
    if (!record.category) ctx.addIssue({ code: "custom", path: ["category"], message: "Custom event category is required" });
  }
  if (record.saleStart && record.saleEnd && record.saleStart > record.saleEnd) {
    ctx.addIssue({ code: "custom", path: ["saleEnd"], message: "Sale end must be on or after sale start" });
  }
});

export type SeasonalEventRecord = z.infer<typeof seasonalEventRecordSchema>;

type EventSettingClient = Pick<PrismaClient, "systemSetting" | "$transaction">;

export function seasonalEventSettingGroup(organizationId: string): string {
  return `${SEASONAL_EVENT_SETTING_TYPE}:${organizationId}`;
}

export function seasonalEventSettingKey(
  organizationId: string,
  source: "library" | "custom",
  eventId: string,
): string {
  const digest = createHash("sha256").update(`${source}:${eventId}`).digest("hex");
  return `${seasonalEventSettingGroup(organizationId)}:${digest}`;
}

export function legacySeasonalEventSettingKey(organizationId: string): string {
  return `custom-events-${organizationId}`;
}

export function createSeasonalEventId(): string {
  return `custom-${randomUUID()}`;
}

export function buildSeasonalEventTheme(primary: string, secondary: string): RegionEvent["theme"] {
  return {
    primary,
    secondary,
    gradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
    bgPattern: `${primary}14`,
  };
}

export function parseSeasonalEventRecord(value: string): SeasonalEventRecord | null {
  try {
    const result = seasonalEventRecordSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function legacyEventToRecord(event: unknown, now: Date): SeasonalEventRecord | null {
  if (!event || typeof event !== "object") return null;
  const value = event as Partial<RegionEvent>;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.emoji !== "string" ||
    !value.category ||
    !["religious", "cultural", "national", "commercial"].includes(value.category)
  ) return null;

  let occurrenceDate: string | null = null;
  if (typeof value.date === "string" && /^\d{2}-\d{2}$/.test(value.date)) {
    const candidate = `${now.getUTCFullYear()}-${value.date}`;
    occurrenceDate = isValidDateOnly(candidate) ? candidate : null;
  }
  const primary = typeof value.theme?.primary === "string" && /^#[0-9a-fA-F]{6}$/.test(value.theme.primary)
    ? value.theme.primary
    : "#D4A73A";
  const secondary = typeof value.theme?.secondary === "string" && /^#[0-9a-fA-F]{6}$/.test(value.theme.secondary)
    ? value.theme.secondary
    : "#F59E0B";
  const timestamp = now.toISOString();
  const result = seasonalEventRecordSchema.safeParse({
    version: SEASONAL_EVENT_RECORD_VERSION,
    id: value.id,
    source: "custom",
    name: value.name,
    description: typeof value.description === "string" ? value.description : "",
    emoji: value.emoji,
    category: value.category,
    occurrenceDate,
    saleStart: null,
    saleEnd: null,
    activationMode: "manual",
    manualActive: false,
    promotionalMessage: typeof value.promotionalMessage === "string" ? value.promotionalMessage : "",
    primaryColor: primary,
    secondaryColor: secondary,
    deleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return result.success ? result.data : null;
}

function parseLegacyEvents(value: string | undefined, now: Date): SeasonalEventRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((event) => legacyEventToRecord(event, now))
      .filter((event): event is SeasonalEventRecord => event !== null);
  } catch {
    return [];
  }
}

export async function loadSeasonalEventRecords(
  client: EventSettingClient,
  organizationId: string,
  now = new Date(),
): Promise<Map<string, SeasonalEventRecord>> {
  const [settings, legacy] = await Promise.all([
    client.systemSetting.findMany({
      where: { category: seasonalEventSettingGroup(organizationId) },
      select: { value: true, updatedAt: true },
    }),
    client.systemSetting.findUnique({
      where: { key: legacySeasonalEventSettingKey(organizationId) },
      select: { value: true },
    }),
  ]);

  const records = new Map<string, SeasonalEventRecord>();
  for (const record of parseLegacyEvents(legacy?.value, now)) records.set(record.id, record);
  for (const setting of settings) {
    const parsed = parseSeasonalEventRecord(setting.value);
    if (!parsed) continue;
    const updatedAt = setting.updatedAt instanceof Date ? setting.updatedAt.toISOString() : parsed.updatedAt;
    records.set(parsed.id, { ...parsed, updatedAt });
  }
  return records;
}

export async function migrateLegacySeasonalEvents(
  client: EventSettingClient,
  organizationId: string,
  now = new Date(),
): Promise<void> {
  const legacyKey = legacySeasonalEventSettingKey(organizationId);
  const legacy = await client.systemSetting.findUnique({
    where: { key: legacyKey },
    select: { value: true },
  });
  if (!legacy) return;
  const records = parseLegacyEvents(legacy.value, now);
  const createRows = records.map((record) => ({
    key: seasonalEventSettingKey(organizationId, record.source, record.id),
    value: JSON.stringify(record),
    category: seasonalEventSettingGroup(organizationId),
  }));
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (createRows.length > 0) {
    operations.push(client.systemSetting.createMany({ data: createRows, skipDuplicates: true }));
  }
  operations.push(client.systemSetting.deleteMany({ where: { key: legacyKey } }));
  await client.$transaction(operations);
}

export async function saveSeasonalEventRecord(
  client: EventSettingClient,
  organizationId: string,
  record: SeasonalEventRecord,
): Promise<void> {
  const parsed = seasonalEventRecordSchema.parse(record);
  const key = seasonalEventSettingKey(organizationId, parsed.source, parsed.id);
  await client.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify(parsed),
      category: seasonalEventSettingGroup(organizationId),
    },
    update: {
      value: JSON.stringify(parsed),
      category: seasonalEventSettingGroup(organizationId),
    },
  });
}
