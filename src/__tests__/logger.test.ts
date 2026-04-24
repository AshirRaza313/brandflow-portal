import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

// =============================================================================
// logger (default export)
// =============================================================================
describe("logger", () => {
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a scoped logger with a prefix", () => {
    const scoped = logger.scope("AuthService");
    scoped.info("User logged in");

    expect(consoleSpy.info).toHaveBeenCalledOnce();
    const output = consoleSpy.info.mock.calls[0][0] as string;
    expect(output).toContain("[INFO]");
    expect(output).toContain("[AuthService]");
    expect(output).toContain("User logged in");
  });

  it("logs at info level via console.info", () => {
    logger.info("Server started");
    expect(consoleSpy.info).toHaveBeenCalledOnce();
    const output = consoleSpy.info.mock.calls[0][0] as string;
    expect(output).toContain("[INFO]");
    expect(output).toContain("Server started");
  });

  it("logs at warn level via console.warn", () => {
    logger.warn("Disk space low", { available: "2GB" });
    expect(consoleSpy.warn).toHaveBeenCalledOnce();
    const output = consoleSpy.warn.mock.calls[0][0] as string;
    expect(output).toContain("[WARN]");
    expect(output).toContain("Disk space low");
    expect(output).toContain("available=2GB");
  });

  it("logs at error level via console.error", () => {
    logger.error("Database connection failed", new Error("Connection refused"));
    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("[ERROR]");
    expect(output).toContain("Database connection failed");
    expect(output).toContain("Error: Connection refused");
  });

  it("logs at fatal level via console.error", () => {
    logger.fatal("Unrecoverable error", new Error("OOM"));
    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("[FATAL]");
    expect(output).toContain("Unrecoverable error");
  });

  it("formats log output with timestamp", () => {
    logger.info("Test message");
    const output = consoleSpy.info.mock.calls[0][0] as string;
    // ISO timestamp format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  it("includes userId in formatted output when provided", () => {
    logger.info("Action performed", { userId: "user-123" });
    const output = consoleSpy.info.mock.calls[0][0] as string;
    // The context is logged, userId in context
    expect(output).toContain("userId=user-123");
  });

  it("serializes context objects as JSON", () => {
    logger.info("Request data", { body: { key: "value" } });
    const output = consoleSpy.info.mock.calls[0][0] as string;
    expect(output).toContain("body=");
    expect(output).toContain('"key":"value"');
  });

  it("throws on circular objects in context (known limitation)", () => {
    const circular: Record<string, unknown> = { name: "test" };
    circular.self = circular;

    // The logger uses JSON.stringify internally which throws on circular refs
    expect(() => {
      logger.info("Circular object", circular as any);
    }).toThrow(/Converting circular structure to JSON/);
  });

  it("handles string errors in error logging", () => {
    logger.error("Something failed", "string error message");
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("Error: string error message");
  });

  it("handles non-Error objects in error logging", () => {
    logger.error("Unknown error", 42);
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("UnknownError: 42");
  });

  it("includes stack trace for Error objects (first 3 lines)", () => {
    const err = new Error("test error");
    logger.error("Test", err);
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("Stack:");
  });

  it("logs debug messages only in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    logger.debug("Debug message");
    expect(consoleSpy.debug).toHaveBeenCalledOnce();

    process.env.NODE_ENV = originalEnv;
  });

  it("suppresses debug messages in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    logger.debug("Debug message");
    expect(consoleSpy.debug).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it("scoped logger includes context", () => {
    const scoped = logger.scope("PaymentService");
    scoped.info("Payment processed", { amount: 100, currency: "USD" });

    expect(consoleSpy.info).toHaveBeenCalledOnce();
    const output = consoleSpy.info.mock.calls[0][0] as string;
    expect(output).toContain("[PaymentService]");
    expect(output).toContain("Payment processed");
    expect(output).toContain("amount=100");
    expect(output).toContain("currency=USD");
  });

  it("scoped logger propagates error details", () => {
    const scoped = logger.scope("API");
    scoped.error("Request failed", new Error("Timeout"));

    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const output = consoleSpy.error.mock.calls[0][0] as string;
    expect(output).toContain("[API]");
    expect(output).toContain("Request failed");
    expect(output).toContain("Timeout");
  });

  it("extracts error info including name and message", () => {
    const err = new Error("DB Error") as Error & { code: string };
    err.code = "ERR_DB_CONN";
    logger.error("Connection issue", err);

    const output = consoleSpy.error.mock.calls[0][0] as string;
    // formatLog outputs error name and message, but NOT the code property
    expect(output).toContain("Error: DB Error");
    expect(output).toContain("Stack:");
  });
});
