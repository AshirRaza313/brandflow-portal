import { describe, expect, it, vi } from "vitest";
import {
  classifyDatabaseError,
  isDatabaseUnavailableError,
  isRetryableDatabaseError,
  retryTransientDatabaseOperation,
} from "@/lib/database-errors";
import {
  buildPrismaUrl,
  DatabaseUrlConfigurationError,
  extractSupabaseProjectRef,
  resolveExpectedDatabaseProjectRef,
} from "@/lib/database-url";
import { loginSchema } from "@/lib/validations";

const PRODUCTION_REF = "wqwsagnxkamblnefhpzx";
const STAGING_REF = "igyqgchgfmcfvjmakvyk";

function poolerUrl(ref = PRODUCTION_REF, port = 6543): string {
  return `postgresql://postgres.${ref}:s%40fe%3Apassword@aws-1-ap-south-1.pooler.supabase.com:${port}/postgres`;
}

describe("database error classification", () => {
  it.each([
    "P1001",
    "P1002",
    "P1008",
    "P1017",
    "P2024",
    "P2037",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
  ])("retries transient error %s", (code) => {
    const error = { code, message: "temporary failure" };
    expect(isRetryableDatabaseError(error)).toBe(true);
    expect(classifyDatabaseError(error)).toBe("transient");
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it.each([
    "DATABASE_URL_CONFIGURATION_ERROR",
    "P1000",
    "P1003",
    "P1010",
    "P1011",
    "P1012",
    "P1013",
    "ENOTFOUND",
  ])("does not retry configuration error %s, but reports service unavailable", (code) => {
    const error = { code, message: "permanent configuration failure" };
    expect(isRetryableDatabaseError(error)).toBe(false);
    expect(classifyDatabaseError(error)).toBe("configuration");
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it.each(["P1014", "P2021", "P2022"])("does not retry schema error %s", (code) => {
    const error = { code, message: "schema mismatch" };
    expect(isRetryableDatabaseError(error)).toBe(false);
    expect(classifyDatabaseError(error)).toBe("schema");
    expect(isDatabaseUnavailableError(error)).toBe(false);
  });

  it("does not misclassify an application query error as an outage", () => {
    const error = { code: "P2002", message: "Unique constraint failed" };
    expect(isRetryableDatabaseError(error)).toBe(false);
    expect(classifyDatabaseError(error)).toBe("query");
    expect(isDatabaseUnavailableError(error)).toBe(false);
  });

  it("finds a transient network code in a nested cause", () => {
    const error = new Error("fetch failed", { cause: { code: "ECONNRESET", message: "socket closed" } });
    expect(isRetryableDatabaseError(error)).toBe(true);
    expect(classifyDatabaseError(error)).toBe("transient");
  });

  it("lets a permanent nested configuration error veto a generic transient message", () => {
    const error = new Error("connection refused", {
      cause: { code: "P1000", message: "Authentication failed against database server" },
    });
    expect(isRetryableDatabaseError(error)).toBe(false);
    expect(classifyDatabaseError(error)).toBe("configuration");
  });

  it("retries a transient operation and eventually succeeds", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: "P1001", message: "temporary" })
      .mockResolvedValue("ok");
    const onRetry = vi.fn();

    await expect(retryTransientDatabaseOperation(operation, 2, 0, onRetry)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("never retries an authentication failure", async () => {
    const error = { code: "P1000", message: "Authentication failed" };
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retryTransientDatabaseOperation(operation, 3, 0)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe("database target and pooler URL guard", () => {
  it("extracts Supabase refs from recognized pooler and direct URLs", () => {
    expect(extractSupabaseProjectRef(poolerUrl())).toBe(PRODUCTION_REF);
    expect(
      extractSupabaseProjectRef(`postgresql://postgres:secret@db.${PRODUCTION_REF}.supabase.co:5432/postgres`)
    ).toBe(PRODUCTION_REF);
  });

  it("never trusts a project-looking username on an arbitrary host", () => {
    const spoofed = `postgresql://postgres.${PRODUCTION_REF}:secret@attacker.example:6543/postgres`;
    expect(extractSupabaseProjectRef(spoofed)).toBeNull();
    expect(() => buildPrismaUrl(spoofed, PRODUCTION_REF)).toThrow(/recognized Supabase/);
  });

  it("uses the direct hostname as identity even when the username is spoofed", () => {
    const spoofed = `postgresql://postgres.${PRODUCTION_REF}:secret@db.${STAGING_REF}.supabase.co:5432/postgres`;
    expect(() => buildPrismaUrl(spoofed, PRODUCTION_REF)).toThrow(/does not match/);
  });

  it("rejects conflicting project refs in a project-specific pooler URL", () => {
    const conflicting =
      `postgresql://postgres.${PRODUCTION_REF}:secret@${STAGING_REF}.pooler.supabase.com:6543/postgres`;
    expect(() => buildPrismaUrl(conflicting, PRODUCTION_REF)).toThrow(/conflicting/);
  });

  it("requires an explicit project contract in production deployments", () => {
    expect(() => buildPrismaUrl(poolerUrl(), undefined, "production")).toThrow(
      /EXPECTED_DATABASE_PROJECT_REF is required/
    );
    expect(resolveExpectedDatabaseProjectRef(undefined, "preview")).toBeUndefined();
  });

  it("adds transaction-pooler and TLS options only to port 6543", () => {
    const result = new URL(buildPrismaUrl(poolerUrl(), PRODUCTION_REF));
    expect(result.searchParams.get("pgbouncer")).toBe("true");
    expect(result.searchParams.get("connection_limit")).toBe("3");
    expect(result.searchParams.get("sslmode")).toBe("require");
    expect(result.searchParams.get("connect_timeout")).toBe("15");
    expect(result.searchParams.get("options")).toBe("-c statement_timeout=10000");
    expect(decodeURIComponent(result.password)).toBe("s@fe:password");
  });

  it("overrides pgbouncer=false on a transaction-pooler URL", () => {
    const result = new URL(buildPrismaUrl(`${poolerUrl()}?pgbouncer=false`, PRODUCTION_REF));
    expect(result.searchParams.get("pgbouncer")).toBe("true");
  });

  it("removes a pgbouncer flag from a session-pooler URL", () => {
    const result = new URL(buildPrismaUrl(`${poolerUrl(PRODUCTION_REF, 5432)}?pgbouncer=true`, PRODUCTION_REF));
    expect(result.searchParams.has("pgbouncer")).toBe(false);
    expect(result.searchParams.has("connection_limit")).toBe(false);
  });

  it("fails closed when the configured Supabase project ref is wrong", () => {
    expect(() => buildPrismaUrl(poolerUrl(STAGING_REF), PRODUCTION_REF)).toThrow(
      DatabaseUrlConfigurationError
    );
  });

  it.each([
    `postgresql://postgres.${PRODUCTION_REF}:secret@aws-1-ap-south-1.pooler.supabase.com:6543/other`,
    `postgresql://postgres.${PRODUCTION_REF}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PRODUCTION_REF}:secret@aws-1-ap-south-1.pooler.supabase.com:9999/postgres`,
  ])("rejects an unsafe Supabase connection shape", (url) => {
    expect(() => buildPrismaUrl(url, PRODUCTION_REF)).toThrow(DatabaseUrlConfigurationError);
  });

  it.each(["disable", "allow", "prefer"])("rejects insecure sslmode=%s", (sslmode) => {
    expect(() => buildPrismaUrl(`${poolerUrl()}?sslmode=${sslmode}`, PRODUCTION_REF)).toThrow(/TLS/);
  });

  it("rejects URL fragments and case-insensitive identity overrides", () => {
    expect(() => buildPrismaUrl(`${poolerUrl()}#ignored`, PRODUCTION_REF)).toThrow(/fragment/);
    expect(() => buildPrismaUrl(`${poolerUrl()}?HOST=other.example`, PRODUCTION_REF)).toThrow(
      /connection identity/
    );
  });
});

describe("login request schema", () => {
  it("accepts password login and defaults the login type", () => {
    expect(loginSchema.parse({ email: "owner@example.com", password: "secret" }).loginType).toBe("password");
  });

  it("accepts an exactly six-digit PIN login", () => {
    expect(loginSchema.safeParse({ email: "member@example.com", pin: "123456", loginType: "pin" }).success).toBe(true);
  });

  it.each(["1234", "1234567", "12a456", " 123456"])("rejects invalid PIN %s", (pin) => {
    expect(loginSchema.safeParse({ email: "member@example.com", pin, loginType: "pin" }).success).toBe(false);
  });

  it("rejects missing credentials for either login type", () => {
    expect(loginSchema.safeParse({ email: "owner@example.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "member@example.com", loginType: "pin" }).success).toBe(false);
  });
});
