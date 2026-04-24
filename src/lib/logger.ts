// ============================================================================
// Structured Error Logging Utility
// ============================================================================
// Centralized logging with levels, context, and formatted output.
// Easy to integrate with Sentry, LogRocket, or any APM service.
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  userId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Format a log entry for console output.
 */
function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, context, userId, error } = entry;
  const parts = [`[${timestamp}]`, `[${level.toUpperCase()}]`];

  if (userId) parts.push(`[User:${userId}]`);
  parts.push(message);

  if (error) {
    parts.push(`\n  Error: ${error.name}: ${error.message}`);
    if (error.stack) parts.push(`\n  Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`);
  }

  if (context && Object.keys(context).length > 0) {
    const ctxStr = Object.entries(context)
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" ");
    parts.push(`\n  Context: ${ctxStr}`);
  }

  return parts.join(" ");
}

/**
 * Extract error info from an unknown error.
 */
function extractError(error: unknown): LogEntry["error"] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }
  if (typeof error === "string") {
    return { name: "Error", message: error };
  }
  return { name: "UnknownError", message: String(error) };
}

/**
 * Core logger function.
 */
function log(level: LogLevel, message: string, options?: { context?: LogContext; userId?: string; error?: unknown; requestId?: string }) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: options?.context,
    userId: options?.userId,
    requestId: options?.requestId,
    error: options?.error ? extractError(options.error) : undefined,
  };

  const formatted = formatLog(entry);

  // Output to console with appropriate method
  switch (level) {
    case "debug":
      if (process.env.NODE_ENV === "development") console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
    case "fatal":
      console.error(formatted);
      break;
  }

  // TODO: Send to external logging service (Sentry, Axiom, etc.)
  // if (process.env.SENTRY_DSN && (level === "error" || level === "fatal")) {
  //   Sentry.captureException(options?.error || new Error(message));
  // }
}

/**
 * Logger with all levels.
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, { context }),
  info: (message: string, context?: LogContext) => log("info", message, { context }),
  warn: (message: string, context?: LogContext) => log("warn", message, { context }),
  error: (message: string, error?: unknown, context?: LogContext) => log("error", message, { error, context }),
  fatal: (message: string, error?: unknown, context?: LogContext) => log("fatal", message, { error, context }),

  /**
   * Create a scoped logger that includes a specific context (e.g., module name).
   * Usage: const log = createLogger("AuthService"); log.info("User logged in");
   */
  scope: (scope: string) => ({
    debug: (message: string, context?: LogContext) => log("debug", `[${scope}] ${message}`, { context }),
    info: (message: string, context?: LogContext) => log("info", `[${scope}] ${message}`, { context }),
    warn: (message: string, context?: LogContext) => log("warn", `[${scope}] ${message}`, { context }),
    error: (message: string, error?: unknown, context?: LogContext) => log("error", `[${scope}] ${message}`, { error, context }),
    fatal: (message: string, error?: unknown, context?: LogContext) => log("fatal", `[${scope}] ${message}`, { error, context }),
  }),
};

export default logger;
