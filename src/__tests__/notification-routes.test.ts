import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

interface NotificationRow {
  id: string;
  orgId: string | null;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

interface ReceiptRow {
  notificationId: string;
  userId: string;
}

const testState = vi.hoisted(() => ({
  userId: "user-a",
  role: "brand_owner",
  organizationId: "org-a" as string | undefined,
  notifications: new Map<string, NotificationRow>(),
  receipts: new Map<string, ReceiptRow>(),
}));

const dbMocks = vi.hoisted(() => {
  const notification = {
    findMany: vi.fn(async ({ where, orderBy, take, skip }: any) => {
      let rows = [...testState.notifications.values()];
      // Apply top-level filters first (orgId always, userId/read/readReceipts if present)
      if (where?.orgId) rows = rows.filter(n => n.orgId === where.orgId);
      if (where?.userId !== undefined) rows = rows.filter(n => n.userId === where.userId);
      if (where?.read !== undefined) rows = rows.filter(n => n.read === where.read);
      if (where?.readReceipts?.none?.userId) {
        const uid = where.readReceipts.none.userId;
        rows = rows.filter(n => ![...testState.receipts.values()].some(r => r.notificationId === n.id && r.userId === uid));
      }
      // If OR present, apply it as an additional AND condition
      if (where?.OR && where?.userId === undefined) {
        rows = rows.filter(n => {
          return where.OR.some((cond: any) => {
            if (cond.userId !== undefined && cond.read !== undefined) {
              return n.userId === cond.userId && n.read === cond.read;
            }
            if (cond.userId === null && cond.read !== undefined) {
              return n.userId === null && n.read === cond.read &&
                ![...testState.receipts.values()].some(r => r.notificationId === n.id && r.userId === testState.userId);
            }
            return false;
          });
        });
      }
      if (where?.NOT?.type?.in) {
        rows = rows.filter(n => !where.NOT.type.in.includes(n.type));
      }
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (take !== undefined && skip !== undefined) {
        rows = rows.slice(skip, skip + take);
      }
      return rows.map(r => ({ ...r }));
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      const rows = [...testState.notifications.values()];
      const found = rows.find(n => n.id === where.id);
      if (!found) return null;
      // audience check if where has OR etc. (simplified: check orgId and userId)
      if (where.orgId && found.orgId !== where.orgId) return null;
      if (where.OR) {
        const allowed = where.OR.some((cond: any) => {
          if (cond.userId === null) return found.userId === null;
          if (cond.userId === testState.userId) return found.userId === testState.userId;
          return false;
        });
        if (!allowed) return null;
      }
      return { ...found };
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      const found = testState.notifications.get(where.id);
      return found ? { ...found } : null;
    }),
    count: vi.fn(async ({ where }: any) => {
      let rows = [...testState.notifications.values()];
      if (where?.orgId) rows = rows.filter(n => n.orgId === where.orgId);
      if (where?.userId !== undefined) rows = rows.filter(n => n.userId === where.userId);
      if (where?.read !== undefined) rows = rows.filter(n => n.read === where.read);
      if (where?.readReceipts?.none?.userId) {
        rows = rows.filter(n => ![...testState.receipts.values()].some(r => r.notificationId === n.id && r.userId === where.readReceipts.none.userId));
      }
      return rows.length;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = testState.notifications.get(where.id);
      if (!row) throw new Error("not found");
      Object.assign(row, data);
      return { ...row };
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of [...testState.notifications.values()]) {
        if (where.orgId && row.orgId !== where.orgId) continue;
        if (where.userId !== undefined && row.userId !== where.userId) continue;
        if (where.read !== undefined && row.read !== where.read) continue;
        if (where.NOT?.type?.in && where.NOT.type.in.includes(row.type)) continue;
        Object.assign(row, data);
        count++;
      }
      return { count };
    }),
  };

  const notificationReadReceipt = {
    findMany: vi.fn(async ({ where }: any) => {
      let rows = [...testState.receipts.values()];
      if (where?.userId) rows = rows.filter(r => r.userId === where.userId);
      if (where?.notificationId?.in) rows = rows.filter(r => where.notificationId.in.includes(r.notificationId));
      return rows.map(r => ({ notificationId: r.notificationId, userId: r.userId }));
    }),
    createMany: vi.fn(async ({ data, skipDuplicates }: any) => {
      let count = 0;
      for (const row of data) {
        const key = `${row.notificationId}:${row.userId}`;
        if (skipDuplicates && testState.receipts.has(key)) continue;
        testState.receipts.set(key, row);
        count++;
      }
      return { count };
    }),
    upsert: vi.fn(async ({ where, create, update }: any) => {
      const key = `${where.notificationId_userId.notificationId}:${where.notificationId_userId.userId}`;
      if (testState.receipts.has(key)) {
        testState.receipts.set(key, { ...testState.receipts.get(key), ...update });
      } else {
        testState.receipts.set(key, { notificationId: create.notificationId, userId: create.userId });
      }
      return testState.receipts.get(key);
    }),
  };

  const db = {
    notification,
    notificationReadReceipt,
    $transaction: vi.fn(async (callback: any) => callback(db)),
  };
  return { db, notification, notificationReadReceipt };
});

vi.mock("@/lib/db", () => ({
  db: dbMocks.db,
  withRetry: (operation: () => unknown) => operation(),
  isDbUnavailable: () => false,
  dbErrorResponse: () => new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503 }),
}));

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => (req: NextRequest, context?: unknown) => handler(req, {
    userId: testState.userId,
    email: "user@example.com",
    role: testState.role,
    organizationId: testState.organizationId,
  }, context),
  isPlatformRole: (role: string) => ["platform_owner", "platform_admin", "valtriox_team"].includes(role),
  AuthContext: {},
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/notification-audience", () => ({
  getNotificationAudienceWhere: (authCtx: any) => ({
    orgId: authCtx.organizationId,
    OR: [
      { userId: null },
      { userId: authCtx.userId },
    ],
  }),
}));

vi.mock("@/lib/plan-limits", () => ({
  isUnlimitedRole: (role: string) => ["platform_owner", "platform_admin", "valtriox_team"].includes(role),
}));

import { GET } from "@/app/api/db-notifications/route";
import { PUT } from "@/app/api/db-notifications/[id]/route";
import { POST } from "@/app/api/db-notifications/mark-all-read/route";

function request(method: string, body?: Record<string, unknown>, path = "/api/db-notifications"): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function json(response: Response): Promise<any> {
  return response.json();
}

describe("Notification routes authorization & read receipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.userId = "user-a";
    testState.role = "brand_owner";
    testState.organizationId = "org-a";
    testState.notifications.clear();
    testState.receipts.clear();
    // Seed test data
    testState.notifications.set("n-target-unread", { id: "n-target-unread", orgId: "org-a", userId: "user-a", title: "Target unread", message: "msg", type: "info", read: false, createdAt: new Date("2026-01-01T10:00:00Z") });
    testState.notifications.set("n-target-read", { id: "n-target-read", orgId: "org-a", userId: "user-a", title: "Target read", message: "msg", type: "info", read: true, createdAt: new Date("2026-01-01T09:00:00Z") });
    testState.notifications.set("n-orgwide-unread", { id: "n-orgwide-unread", orgId: "org-a", userId: null, title: "Orgwide unread", message: "msg", type: "info", read: false, createdAt: new Date("2026-01-01T08:00:00Z") });
    testState.notifications.set("n-orgwide-legacy-read", { id: "n-orgwide-legacy-read", orgId: "org-a", userId: null, title: "Legacy read", message: "msg", type: "info", read: true, createdAt: new Date("2026-01-01T07:00:00Z") });
    testState.notifications.set("n-other-user", { id: "n-other-user", orgId: "org-a", userId: "user-b", title: "Other user", message: "msg", type: "info", read: false, createdAt: new Date("2026-01-01T06:00:00Z") });
  });

  it("GET unread returns only current user's unread notifications, excludes legacy read", async () => {
    const res = await GET(request("GET", undefined, "/api/db-notifications?unread=true&limit=10&offset=0"));
    expect(res.status).toBe(200);
    const data = await json(res);
    const ids = data.notifications.map((n: any) => n.id);
    expect(ids).toContain("n-target-unread");
    expect(ids).toContain("n-orgwide-unread");
    expect(ids).not.toContain("n-target-read");
    expect(ids).not.toContain("n-orgwide-legacy-read");
    expect(ids).not.toContain("n-other-user");
    expect(data.unreadCount).toBe(2);
  });

  it("PUT single org-wide creates receipt instead of updating global read", async () => {
    const res = await PUT(request("PUT", undefined, "/api/db-notifications/n-orgwide-unread"));
    expect(res.status).toBe(200);
    // global read should remain false
    expect(testState.notifications.get("n-orgwide-unread")?.read).toBe(false);
    // receipt should exist
    expect(testState.receipts.has("n-orgwide-unread:user-a")).toBe(true);
  });

  it("PUT single targeted updates read flag", async () => {
    const res = await PUT(request("PUT", undefined, "/api/db-notifications/n-target-unread"));
    expect(res.status).toBe(200);
    expect(testState.notifications.get("n-target-unread")?.read).toBe(true);
  });

  it("bulk mark-all-read creates receipts for org-wide and updates targeted", async () => {
    const res = await POST(request("POST", undefined, "/api/db-notifications/mark-all-read?orgId=org-a"));
    expect(res.status).toBe(200);
    expect(testState.notifications.get("n-target-unread")?.read).toBe(true);
    expect(testState.receipts.has("n-orgwide-unread:user-a")).toBe(true);
    // other user's notification untouched
    expect(testState.notifications.get("n-other-user")?.read).toBe(false);
  });

  it("cross-org PUT denied", async () => {
    testState.organizationId = "org-b";
    const res = await PUT(request("PUT", undefined, "/api/db-notifications/n-target-unread"));
    expect(res.status).toBe(404); // not found because audience mismatch returns 404
  });
});






