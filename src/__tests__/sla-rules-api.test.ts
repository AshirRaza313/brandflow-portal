import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const testState = vi.hoisted(() => ({
  organizationId: "org-a" as string | undefined,
  role: "brand_owner",
  settings: new Map<string, string>(),
}));

const dbMocks = vi.hoisted(() => {
  const systemSetting = {
    findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
      const value = testState.settings.get(where.key);
      return value !== undefined ? { value } : null;
    }),
    upsert: vi.fn(async ({
      where,
      create,
      update,
    }: {
      where: { key: string };
      create: { key: string; value: string; category: string };
      update: { value: string };
    }) => {
      const value = testState.settings.has(where.key) ? update.value : create.value;
      testState.settings.set(where.key, value);
      return { key: where.key, value, category: create.category };
    }),
  };
  const db = {
    systemSetting,
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };
  return { db, systemSetting };
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

import { GET, POST, PUT } from "@/app/api/sla/rules/route";

function request(method: string, body?: Record<string, unknown>, path = "/api/sla/rules"): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    name: "Order Confirmation",
    fromStatus: "pending",
    toStatus: "confirmed",
    timeLimitHours: 24,
    responsibleRole: "sales_manager",
    escalationAction: "Notify team lead",
    enabled: true,
    ...overrides,
  };
}

async function json(response: Response): Promise<any> {
  return response.json();
}

describe("SLA rules API enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.organizationId = "org-a";
    testState.role = "brand_owner";
    testState.settings.clear();
  });

  it("rejects invalid role in POST before persistence", async () => {
    const response = await POST(request("POST", validRule({ responsibleRole: "invalid_role" })));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toContain("invalid responsibleRole");
    expect(dbMocks.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("rejects time limit > max in POST", async () => {
    const response = await POST(request("POST", validRule({ timeLimitHours: 9999 })));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toContain("invalid timeLimitHours");
  });

  it("rejects invalid rule in PUT batch", async () => {
    const valid = validRule();
    const invalid = validRule({ id: "rule-2", fromStatus: "bad_status" });
    const response = await PUT(request("PUT", { organizationId: "org-a", rules: [valid, invalid] }));
    expect(response.status).toBe(400);
    expect((await json(response)).error).toContain("invalid fromStatus");
    expect(dbMocks.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("accepts valid POST and persists per-org without default mutation", async () => {
    // First org-a POST
    const postRes = await POST(request("POST", validRule({ name: "Custom Confirmation" })));
    expect(postRes.status).toBe(201);
    expect(dbMocks.systemSetting.upsert).toHaveBeenCalledTimes(1);

    // Now org-b GET should return only defaults (4 rules), not the custom one
    testState.organizationId = "org-b";
    testState.settings.clear(); // simulate fresh org-b with no settings
    const getRes = await GET(request("GET"));
    expect(getRes.status).toBe(200);
    const data = await json(getRes);
    expect(data.rules).toHaveLength(4);
    expect(data.rules.some((r: any) => r.name === "Custom Confirmation")).toBe(false);
  });

  it("persists PUT batch after validating all rules", async () => {
    const rules = [validRule(), validRule({ id: "rule-2", name: "Packaging", fromStatus: "confirmed", toStatus: "packed" })];
    const response = await PUT(request("PUT", { organizationId: "org-a", rules }));
    expect(response.status).toBe(200);
    const data = await json(response);
    expect(data.rules).toHaveLength(2);
    expect(dbMocks.systemSetting.upsert).toHaveBeenCalledTimes(1);
  });

  it("round-trips POST -> GET persisted validated rules", async () => {
    const postRes = await POST(request("POST", validRule({ name: "Round Trip" })));
    expect(postRes.status).toBe(201);

    const getRes = await GET(request("GET"));
    expect(getRes.status).toBe(200);
    const getData = await json(getRes);
    expect(getData.rules.some((r: any) => r.name === "Round Trip")).toBe(true);
  });
});
