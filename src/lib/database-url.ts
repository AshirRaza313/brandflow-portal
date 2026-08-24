const SUPABASE_PROJECT_REF = /^[a-z0-9]{20}$/;
const SUPABASE_DIRECT_HOST = /^db\.([a-z0-9]{20})\.supabase\.co$/i;
const SUPABASE_POOLER_HOST = /^(?:aws-[01]-[a-z0-9-]+|[a-z0-9]{20})\.pooler\.supabase\.com$/i;
const INSECURE_SSL_MODES = new Set(["disable", "allow", "prefer"]);

export class DatabaseUrlConfigurationError extends Error {
  readonly code = "DATABASE_URL_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "DatabaseUrlConfigurationError";
  }
}

function decodeUrlPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new DatabaseUrlConfigurationError("Database URL contains invalid URL encoding");
  }
}

function parsePostgresUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DatabaseUrlConfigurationError("Database URL is not a valid URL");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname) {
    throw new DatabaseUrlConfigurationError("Database URL must be a PostgreSQL URL");
  }
  if (parsed.hash) {
    throw new DatabaseUrlConfigurationError("Database URL must not contain a URL fragment");
  }

  for (const [key] of parsed.searchParams) {
    if (["host", "port", "user", "password", "database", "dbname"].includes(key.toLowerCase())) {
      throw new DatabaseUrlConfigurationError("Database URL must not override connection identity in query parameters");
    }
  }

  return parsed;
}

function poolerProjectRef(parsed: URL): string | null {
  if (!SUPABASE_POOLER_HOST.test(parsed.hostname)) return null;

  const username = decodeUrlPart(parsed.username);
  const usernameMatch = username.match(/^[a-z0-9_-]+\.([a-z0-9]{20})$/i);
  if (!usernameMatch) return null;

  const usernameRef = usernameMatch[1].toLowerCase();
  const hostPrefix = parsed.hostname.split(".", 1)[0].toLowerCase();
  if (SUPABASE_PROJECT_REF.test(hostPrefix) && hostPrefix !== usernameRef) {
    throw new DatabaseUrlConfigurationError("Database URL contains conflicting Supabase project identities");
  }
  return usernameRef;
}

/**
 * Extract a Supabase project ref only from a recognized Supabase connection
 * shape. A username alone is never trusted because it could point at an
 * attacker-controlled host.
 */
export function extractSupabaseProjectRef(rawUrl: string): string | null {
  const parsed = parsePostgresUrl(rawUrl);
  const directMatch = parsed.hostname.match(SUPABASE_DIRECT_HOST);
  if (directMatch) return directMatch[1].toLowerCase();
  return poolerProjectRef(parsed);
}

/**
 * Production Vercel deployments must declare the project they are allowed to
 * contact. Preview/development deployments opt in by setting the same variable
 * to their environment-specific ref; when present it is always enforced.
 */
export function resolveExpectedDatabaseProjectRef(
  rawExpectedRef: string | undefined,
  deploymentEnvironment: string | undefined = process.env.VERCEL_ENV
): string | undefined {
  const expected = rawExpectedRef?.trim().toLowerCase();
  if (!expected) {
    if (deploymentEnvironment?.toLowerCase() === "production") {
      throw new DatabaseUrlConfigurationError(
        "EXPECTED_DATABASE_PROJECT_REF is required for production deployments"
      );
    }
    return undefined;
  }
  if (!SUPABASE_PROJECT_REF.test(expected)) {
    throw new DatabaseUrlConfigurationError("EXPECTED_DATABASE_PROJECT_REF is invalid");
  }
  return expected;
}

function enforceSupabaseTarget(parsed: URL, expected: string): void {
  const directMatch = parsed.hostname.match(SUPABASE_DIRECT_HOST);
  const isDirect = Boolean(directMatch);
  const isPooler = SUPABASE_POOLER_HOST.test(parsed.hostname);

  if (!isDirect && !isPooler) {
    throw new DatabaseUrlConfigurationError("Database URL must use a recognized Supabase database host");
  }
  if (!parsed.username || !parsed.password) {
    throw new DatabaseUrlConfigurationError("Database URL must include database credentials");
  }
  if (decodeUrlPart(parsed.pathname) !== "/postgres") {
    throw new DatabaseUrlConfigurationError("Database URL must select the Supabase postgres database");
  }

  const actual = isDirect ? directMatch![1].toLowerCase() : poolerProjectRef(parsed);
  if (actual !== expected) {
    throw new DatabaseUrlConfigurationError("Database URL project does not match the expected environment");
  }

  if (isDirect && parsed.port && parsed.port !== "5432") {
    throw new DatabaseUrlConfigurationError("Supabase direct database URL must use port 5432");
  }
  if (isPooler && !["5432", "6543"].includes(parsed.port)) {
    throw new DatabaseUrlConfigurationError("Supabase pooler URL must use port 5432 or 6543");
  }

  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode && INSECURE_SSL_MODES.has(sslMode)) {
    throw new DatabaseUrlConfigurationError("Supabase database URL must require TLS");
  }
  if (!sslMode) parsed.searchParams.set("sslmode", "require");
}

export function buildPrismaUrl(
  rawUrl: string,
  rawExpectedProjectRef?: string,
  deploymentEnvironment: string | undefined = process.env.VERCEL_ENV
): string {
  const expected = resolveExpectedDatabaseProjectRef(rawExpectedProjectRef, deploymentEnvironment);
  if (!rawUrl) return "";

  const parsed = parsePostgresUrl(rawUrl);
  if (expected) enforceSupabaseTarget(parsed, expected);

  const isPooler = SUPABASE_POOLER_HOST.test(parsed.hostname);
  const isTransactionPooler = isPooler && parsed.port === "6543";
  if (isTransactionPooler) {
    parsed.searchParams.set("pgbouncer", "true");
    if (!parsed.searchParams.has("connection_limit") && !parsed.searchParams.has("pool_size")) {
      parsed.searchParams.set("connection_limit", "3");
    }
  } else if (isPooler) {
    parsed.searchParams.delete("pgbouncer");
  }
  if (!parsed.searchParams.has("connect_timeout")) parsed.searchParams.set("connect_timeout", "15");
  if (!parsed.searchParams.has("options")) {
    parsed.searchParams.set("options", "-c statement_timeout=10000");
  }
  return parsed.toString();
}
