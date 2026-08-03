import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

interface SettingRow {
  key: string;
  value: string;
  category: string;
  updatedAt: Date;
}

interface EventJson {
  id: string;
  [key: string]: unknown;
}

interface ApiJson {
  event?: EventJson;
  activeEvent?: EventJson | null;
  customEvents?: EventJson[];
  country?: string;
  timezone?: string;
  serverNow?: string;
  [key: string]: unknown;
}

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "brand_owner",
  settings: new Map<string, SettingRow>(),
  organizations: new Map<string, { country: string; religion: string; timezone: string }>(),
  memberships: new Map<string, {
    userId: string;
    role: string;
    roleDef: { name: string; permissions: string } | null;
  }>(),
  valtrioxTeamMembers: new Map<string, { id: string; visibleSections: string }>(),
}));

const dbMocks = vi.hoisted(() => {
  const systemSetting = {
    findMany: vi.fn(async ({ where }: { where: { category: string } }) => (
      [...testState.settings.values()]
        .filter((setting) => setting.category === where.category)
        .map((setting) => ({ value: setting.value, updatedAt: setting.updatedAt }))
    )),
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
      const setting = testState.settings.get(where.key);
      return setting ? { value: setting.value } : null;
    }),
    createMany: vi.fn(async ({
      data,
      skipDuplicates,
    }: {
      data: Array<{ key: string; value: string; category: string }>;
      skipDuplicates?: boolean;
    }) => {
      let count = 0;
      for (const row of data) {
        if (skipDuplicates && testState.settings.has(row.key)) continue;
        testState.settings.set(row.key, { ...row, updatedAt: new Date() });
        count += 1;
      }
      return { count };
    }),
    upsert: vi.fn(async ({
      where,
      create,
      update,
    }: {
      where: { key: string };
      create: { key: string; value: string; category: string };
      update: { value: string; category: string };
    }) => {
      const row = testState.settings.has(where.key)
        ? { key: where.key, ...update }
        : create;
      const setting = { ...row, updatedAt: new Date() };
      testState.settings.set(where.key, setting);
      return setting;
    }),
    deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => ({
      count: testState.settings.delete(where.key) ? 1 : 0,
    })),
  };

  const organization = {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (
      testState.organizations.get(where.id) || null
    )),
  };

  const organizationMember = {
    findFirst: vi.fn(async ({ where }: { where: { organizationId: string; userId: string } }) => (
      testState.memberships.get(`${where.organizationId}:${where.userId}`) || null
    )),
  };

  const valtrioxTeamMember = {
    findFirst: vi.fn(async ({ where }: { where: { userId: string; status: string } }) => (
      where.status === "active" ? testState.valtrioxTeamMembers.get(where.userId) || null : null
    )),
  };

  const db = {
    systemSetting,
    organization,
    organizationMember,
    valtrioxTeamMember,
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };

  return { db, systemSetting, organization, organizationMember, valtrioxTeamMember };
});

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: (operation: () => unknown) => operation(),
  isDbUnavailable: () => false,
  dbErrorResponse: () => new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503 }),
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => (req: NextRequest, context?: unknown) => handler(req, {
    userId: "user-a",
    email: "owner@example.com",
    role: testState.role,
    organizationId: testState.organizationId,
  }, context),
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/events/region/route";
import { GET as GET_ACTIVE } from "@/app/api/events/active/route";
import { seasonalEventSettingGroup } from "@/lib/event-setting-store";

function request(method: string, body?: Record<string, unknown>, path = "/api/events/region"): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Founders Week",
    description: "Our annual brand celebration",
    emoji: "🎉",
    category: "commercial",
    occurrenceDate: "2026-08-05",
    saleStart: "2026-08-01",
    saleEnd: "2026-08-09",
    activationMode: "automatic",
    manualActive: false,
    promotionalMessage: "Founders Week — save 25%",
    primaryColor: "#123456",
    secondaryColor: "#abcdef",
    ...overrides,
  };
}

async function json(response: Response): Promise<ApiJson> {
  return response.json() as Promise<ApiJson>;
}

describe("seasonal event API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));
    testState.organizationId = "org-a";
    testState.role = "brand_owner";
    testState.settings.clear();
    testState.organizations.clear();
    testState.memberships.clear();
    testState.valtrioxTeamMembers.clear();
    testState.organizations.set("org-a", { country: "PK", religion: "islam", timezone: "Asia/Karachi" });
    testState.organizations.set("org-b", { country: "US", religion: "christianity", timezone: "America/New_York" });
    testState.memberships.set("org-a:user-a", { userId: "user-a", role: "brand_owner", roleDef: null });
    testState.memberships.set("org-b:user-a", { userId: "user-a", role: "brand_owner", roleDef: null });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists a custom event per organization and retains its promotional content", async () => {
    const created = await POST(request("POST", validEvent()));
    const createdData = await json(created);

    expect(created.status).toBe(201);
    expect(created.headers.get("Cache-Control")).toContain("no-store");
    expect(created.headers.get("Vary")).toBe("Cookie");
    expect(createdData.event).toMatchObject({
      source: "custom",
      name: "Founders Week",
      promotionalMessage: "Founders Week — save 25%",
      saleStart: "2026-08-01",
      saleEnd: "2026-08-09",
      scheduleStatus: "active",
    });

    const rows = [...testState.settings.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe(seasonalEventSettingGroup("org-a"));

    const refreshed = await GET(request("GET"));
    const refreshedData = await json(refreshed);
    expect(refreshedData.customEvents).toHaveLength(1);
    expect(refreshedData.customEvents?.[0].id).toBe(createdData.event?.id);
  });

  it("keeps reads isolated to the authenticated organization", async () => {
    await POST(request("POST", validEvent()));

    testState.organizationId = "org-b";
    const response = await GET(request("GET"));
    const data = await json(response);

    expect(response.status).toBe(200);
    expect(data.customEvents).toEqual([]);
    expect(data.country).toBe("US");
  });

  it("supports persisted edits and deletion without losing other event rows", async () => {
    const first = await json(await POST(request("POST", validEvent())));
    const second = await json(await POST(request("POST", validEvent({ name: "Second Event" }))));

    const updated = await PATCH(request("PATCH", validEvent({
      id: first.event?.id,
      name: "Updated Founders Week",
      activationMode: "manual",
      manualActive: false,
      promotionalMessage: "Updated offer",
    })));
    expect(updated.status).toBe(200);
    expect((await json(updated)).event).toMatchObject({
      id: first.event?.id,
      name: "Updated Founders Week",
      promotionalMessage: "Updated offer",
      scheduleStatus: "paused",
    });

    const deleted = await DELETE(request("DELETE", { id: first.event?.id }));
    expect(deleted.status).toBe(200);
    const refreshed = await json(await GET(request("GET")));
    expect(refreshed.customEvents?.map((item) => item.id)).toEqual([second.event?.id]);
  });

  it("rejects invalid sale windows and unsafe colors before persistence", async () => {
    const reversed = await POST(request("POST", validEvent({
      saleStart: "2026-08-10",
      saleEnd: "2026-08-01",
    })));
    const unsafeColor = await POST(request("POST", validEvent({ primaryColor: "red; background:url(x)" })));

    expect(reversed.status).toBe(422);
    expect(unsafeColor.status).toBe(422);
    expect(testState.settings.size).toBe(0);
    expect(dbMocks.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("allows reads but denies every mutation to a viewer", async () => {
    testState.role = "viewer";
    testState.memberships.set("org-a:user-a", { userId: "user-a", role: "viewer", roleDef: null });

    expect((await GET(request("GET"))).status).toBe(200);
    expect((await POST(request("POST", validEvent()))).status).toBe(403);
    expect((await PATCH(request("PATCH", validEvent({ id: "pk-newyear" })))).status).toBe(403);
    expect((await DELETE(request("DELETE", { id: "custom-any" }))).status).toBe(403);
    expect(dbMocks.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("rejects platform sessions with no selected organization before database access", async () => {
    testState.organizationId = undefined;
    testState.role = "platform_owner";

    expect((await GET(request("GET"))).status).toBe(403);
    expect((await POST(request("POST", validEvent()))).status).toBe(403);
    expect(dbMocks.organization.findUnique).not.toHaveBeenCalled();
    expect(dbMocks.systemSetting.findMany).not.toHaveBeenCalled();
    expect(dbMocks.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("uses the current database role instead of a stale privileged session claim", async () => {
    testState.role = "brand_owner";
    testState.memberships.set("org-a:user-a", {
      userId: "user-a",
      role: "operations_manager",
      roleDef: null,
    });

    expect((await GET(request("GET"))).status).toBe(403);
    expect((await POST(request("POST", validEvent()))).status).toBe(403);
    expect((await GET_ACTIVE(request("GET", undefined, "/api/events/active"))).status).toBe(200);
    expect(dbMocks.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("rejects revoked organization membership on both seasonal routes", async () => {
    testState.memberships.delete("org-a:user-a");

    expect((await GET(request("GET"))).status).toBe(403);
    expect((await POST(request("POST", validEvent()))).status).toBe(403);
    expect((await GET_ACTIVE(request("GET", undefined, "/api/events/active"))).status).toBe(403);
    expect(dbMocks.organization.findUnique).not.toHaveBeenCalled();
  });

  it("honors database-backed custom Marketing permissions and Valtriox page visibility", async () => {
    testState.memberships.set("org-a:user-a", {
      userId: "user-a",
      role: "custom",
      roleDef: { name: "custom", permissions: JSON.stringify({ marketing: true }) },
    });
    expect((await POST(request("POST", validEvent()))).status).toBe(201);

    testState.valtrioxTeamMembers.set("user-a", {
      id: "vt-a",
      visibleSections: JSON.stringify(["seasonal-sales"]),
    });
    expect((await GET(request("GET"))).status).toBe(403);
    expect((await POST(request("POST", validEvent({ name: "Hidden Page Event" })))).status).toBe(403);
    expect((await GET_ACTIVE(request("GET", undefined, "/api/events/active"))).status).toBe(200);
  });

  it("returns only the organization-scoped active event for the shared portal banner", async () => {
    const created = await json(await POST(request("POST", validEvent())));
    const response = await GET_ACTIVE(request("GET", undefined, "/api/events/active"));
    const data = await json(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(data.activeEvent).toMatchObject({ id: created.event?.id, scheduleStatus: "active" });
    expect(data.timezone).toBe("Asia/Karachi");
    expect(data.serverNow).toBe("2026-08-03T12:00:00.000Z");
  });
});
