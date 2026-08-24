export type DatabaseErrorKind = "configuration" | "schema" | "transient" | "query";

export interface DatabaseErrorInfo {
  code: string;
  message: string;
}

const TRANSIENT_CODES = new Set([
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
]);

const CONFIGURATION_CODES = new Set([
  "DATABASE_URL_CONFIGURATION_ERROR",
  "P1000",
  "P1003",
  "P1010",
  "P1011",
  "P1012",
  "P1013",
  "ENOTFOUND",
]);
const SCHEMA_CODES = new Set(["P1014", "P2021", "P2022"]);

const TRANSIENT_MESSAGES = [
  "can't reach database server",
  "connection timeout",
  "connection timed out",
  "connection closed",
  "connection ended",
  "connection reset",
  "connection refused",
  "socket hang up",
  "too many connections",
  "pool exhausted",
  "connect etimedout",
  "econnreset",
  "econnrefused",
  "eai_again",
];

function errorChain(error: unknown): Array<Record<string, unknown>> {
  const chain: Array<Record<string, unknown>> = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && chain.length < 5 && !seen.has(current)) {
    seen.add(current);
    const record = current as Record<string, unknown>;
    chain.push(record);
    current = record.cause;
  }
  return chain;
}

function errorSignals(error: unknown): { codes: string[]; messages: string[] } {
  const chain = errorChain(error);
  if (chain.length === 0) return { codes: [], messages: [String(error)] };

  return {
    codes: chain.flatMap((record) => typeof record.code === "string" ? [record.code] : []),
    messages: chain.flatMap((record) => typeof record.message === "string" ? [record.message] : []),
  };
}

export function getDatabaseErrorInfo(error: unknown): DatabaseErrorInfo {
  const { codes, messages } = errorSignals(error);
  return {
    code: codes[0] || "",
    message: messages[0] || String(error),
  };
}

export function isRetryableDatabaseError(error: unknown): boolean {
  const { codes, messages } = errorSignals(error);
  const normalized = messages.join("\n").toLowerCase();
  if (
    codes.some((code) => CONFIGURATION_CODES.has(code) || SCHEMA_CODES.has(code)) ||
    normalized.includes("authentication failed") ||
    normalized.includes("database url") ||
    normalized.includes("datasource url") ||
    normalized.includes("prepared statement already exists")
  ) {
    return false;
  }
  if (codes.some((code) => TRANSIENT_CODES.has(code))) return true;
  return TRANSIENT_MESSAGES.some((pattern) => normalized.includes(pattern));
}

export function classifyDatabaseError(error: unknown): DatabaseErrorKind {
  const { codes, messages } = errorSignals(error);
  const normalized = messages.join("\n").toLowerCase();

  if (
    codes.some((code) => CONFIGURATION_CODES.has(code)) ||
    normalized.includes("authentication failed") ||
    normalized.includes("database url") ||
    normalized.includes("datasource url") ||
    normalized.includes("prepared statement already exists")
  ) {
    return "configuration";
  }
  if (
    codes.some((code) => SCHEMA_CODES.has(code)) ||
    (normalized.includes("relation") && normalized.includes("does not exist")) ||
    (normalized.includes("column") && normalized.includes("does not exist"))
  ) {
    return "schema";
  }
  if (isRetryableDatabaseError(error)) return "transient";
  return "query";
}

/** Configuration and transient connection failures both mean the service is unavailable. */
export function isDatabaseUnavailableError(error: unknown): boolean {
  const kind = classifyDatabaseError(error);
  return kind === "configuration" || kind === "transient";
}

export async function retryTransientDatabaseOperation<TResult>(
  operation: () => TResult,
  retries = 3,
  baseDelay = 300,
  onRetry?: (event: { attempt: number; retries: number; delay: number; code: string }) => void
): Promise<Awaited<TResult>> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === retries || !isRetryableDatabaseError(error)) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      onRetry?.({
        attempt: attempt + 1,
        retries,
        delay,
        code: getDatabaseErrorInfo(error).code || "unknown",
      });
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
