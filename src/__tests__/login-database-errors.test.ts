import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  withRetry: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUnique },
    organizationMember: { update: vi.fn(), findFirst: vi.fn() },
    valtrioxTeamMember: { findFirst: vi.fn() },
    teamInvitation: { updateMany: vi.fn() },
    notification: { create: vi.fn() },
    organization: { findFirst: vi.fn() },
  },
  withRetry: mocks.withRetry,
}));

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}));

vi.mock("@/lib/auth-middleware", () => ({
  signAuthData: vi.fn(() => "test-signature"),
}));

import { POST } from "@/app/api/auth/login/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("login database failure handling", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres.test:secret@localhost:5432/postgres";
    mocks.findUnique.mockReset();
    mocks.withRetry.mockReset();
    mocks.loggerError.mockReset();
    mocks.withRetry.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it("returns DB_NOT_CONFIGURED without querying when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL;
    const response = await POST(request({ email: "owner@example.com", password: "secret" }));
    expect(response.status).toBe(503);
    expect(await responseJson(response)).toMatchObject({ code: "DB_NOT_CONFIGURED" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("does not retry or expose a P1000 authentication failure", async () => {
    mocks.findUnique.mockRejectedValueOnce({
      code: "P1000",
      message: "Authentication failed with password do-not-expose",
    });
    const response = await POST(request({ email: "owner@example.com", password: "secret" }));
    const body = await responseJson(response);
    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Database configuration error.", code: "DB_CONFIGURATION_ERROR" });
    expect(JSON.stringify(body)).not.toContain("do-not-expose");
    expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain("do-not-expose");
    expect(mocks.withRetry).toHaveBeenCalledWith(expect.any(Function), 1, 150);
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it.each(["P2021", "P2022", "P1014"])("returns SCHEMA_MISMATCH for %s without a fallback query", async (code) => {
    mocks.findUnique.mockRejectedValueOnce({ code, message: "schema object does not exist" });
    const response = await POST(request({ email: "owner@example.com", password: "secret" }));
    expect(response.status).toBe(503);
    expect(await responseJson(response)).toMatchObject({ code: "SCHEMA_MISMATCH" });
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });

  it("returns DB_CONNECTION_FAILED for a repeated transient outage", async () => {
    mocks.findUnique.mockRejectedValue({ code: "P1001", message: "Can't reach database server" });
    mocks.withRetry.mockImplementation(async (operation: () => Promise<unknown>) => {
      try {
        return await operation();
      } catch {
        return operation();
      }
    });
    const response = await POST(request({ email: "owner@example.com", password: "secret" }));
    expect(response.status).toBe(503);
    expect(await responseJson(response)).toMatchObject({ code: "DB_CONNECTION_FAILED" });
    expect(mocks.findUnique).toHaveBeenCalledTimes(2);
  });

  it("recovers from one transient failure and reaches the normal 401 result", async () => {
    mocks.findUnique
      .mockRejectedValueOnce({ code: "P1001", message: "Can't reach database server" })
      .mockResolvedValueOnce(null);
    mocks.withRetry.mockImplementation(async (operation: () => Promise<unknown>) => {
      try {
        return await operation();
      } catch {
        return operation();
      }
    });
    const response = await POST(request({ email: "missing@example.com", password: "secret" }));
    expect(response.status).toBe(401);
    expect(mocks.findUnique).toHaveBeenCalledTimes(2);
  });

  it("returns a 500 query error for an unrelated Prisma error", async () => {
    mocks.findUnique.mockRejectedValueOnce({ code: "P2002", message: "Unique constraint failed" });
    const response = await POST(request({ email: "owner@example.com", password: "secret" }));
    expect(response.status).toBe(500);
    expect(await responseJson(response)).toEqual({ error: "Database query failed.", code: "DB_QUERY_FAILED" });
  });
});
