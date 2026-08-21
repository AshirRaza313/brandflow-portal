"use strict";

const PRODUCTION_REF = "wqwsagnxkamblnefhpzx";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseConnectionUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") return null;
    const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const port = Number(parsed.port || 5432);
    const dbname = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const user = decodeURIComponent(parsed.username);
    if (!host || !Number.isInteger(port) || !dbname || !user) return null;
    const urlSearchParameters = [...new Set(parsed.searchParams.keys())].sort();
    return { host, port, dbname, user, urlSearchParameters };
  } catch {
    return null;
  }
}

function projectRefFor(parsed) {
  const direct = parsed.host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (direct) return direct[1];
  if (parsed.host.endsWith(".pooler.supabase.com")) {
    const match = parsed.user.match(/(?:^|\.)([a-z0-9]{20})$/);
    return match ? match[1] : null;
  }
  return null;
}

function requireExpectedIdentity(parsed, prefix) {
  const expectedHost = process.env[`${prefix}_EXPECTED_HOST`];
  const expectedUser = process.env[`${prefix}_EXPECTED_DB_USER`];
  const expectedDb = process.env[`${prefix}_EXPECTED_DB_NAME`] || "postgres";
  if (!expectedHost || !expectedUser) {
    fail(`${prefix}_EXPECTED_HOST and ${prefix}_EXPECTED_DB_USER are required`);
  }
  if (parsed.host !== expectedHost.toLowerCase()) {
    fail(`${prefix}: host mismatch; expected ${expectedHost}, got ${parsed.host}`);
  }
  if (parsed.user !== expectedUser) {
    fail(`${prefix}: database user mismatch`);
  }
  if (parsed.dbname !== expectedDb) {
    fail(`${prefix}: database name must be ${expectedDb}, got ${parsed.dbname}`);
  }
  const isPooler = parsed.host.endsWith(".pooler.supabase.com");
  const expectedRole = process.env[`${prefix}_EXPECTED_DB_ROLE`] || (isPooler ? "" : parsed.user);
  if (!expectedRole) {
    fail(`${prefix}_EXPECTED_DB_ROLE is required for a Supabase pooler connection`);
  }
  parsed.expectedConnectedRole = expectedRole;
}

function validateRehearsalUrl(envVar) {
  const parsed = parseConnectionUrl(process.env[envVar]);
  if (!parsed) fail(`${envVar}: invalid PostgreSQL connection string`);
  if (parsed.urlSearchParameters.length > 0) {
    fail(`${envVar}: URL query parameters are not allowed`);
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.host);
  const isGithubCi = process.env.CI === "true" && process.env.GITHUB_ACTIONS === "true";

  if (isLocal) {
    if (!isGithubCi) fail(`${envVar}: localhost is allowed only in GitHub Actions CI`);
    if (parsed.port !== 5432 || parsed.dbname !== "valtriox_test" || parsed.user !== "valtriox_test") {
      fail(`${envVar}: CI target must be valtriox_test@localhost:5432/valtriox_test`);
    }
    parsed.isLocal = true;
    parsed.projectRef = "ci-localhost";
    parsed.expectedConnectedRole = parsed.user;
    return parsed;
  }

  if (parsed.port !== 5432) fail(`${envVar}: remote rehearsal must use session/direct port 5432`);
  const projectRef = projectRefFor(parsed);
  if (!projectRef) fail(`${envVar}: unable to derive Supabase project ref from validated URL`);
  if (projectRef === PRODUCTION_REF) fail(`${envVar}: production project is never a rehearsal target`);

  const allowed = (process.env.ALLOWED_STAGING_REFS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.length === 0) fail("ALLOWED_STAGING_REFS must contain the exact staging project ref");
  if (!allowed.includes(projectRef)) fail(`${envVar}: project ref ${projectRef} is not allowlisted`);
  requireExpectedIdentity(parsed, "REHEARSAL");

  parsed.isLocal = false;
  parsed.projectRef = projectRef;
  return parsed;
}

function validateProductionUrl(envVar) {
  const parsed = parseConnectionUrl(process.env[envVar]);
  if (!parsed) fail(`${envVar}: invalid PostgreSQL connection string`);
  if (parsed.urlSearchParameters.length > 0) {
    fail(`${envVar}: URL query parameters are not allowed`);
  }
  if (parsed.port !== 5432) fail(`${envVar}: production evidence requires direct/session port 5432`);

  const projectRef = projectRefFor(parsed);
  if (projectRef !== PRODUCTION_REF) {
    fail(`${envVar}: target is not the approved production project`);
  }
  requireExpectedIdentity(parsed, "PRODUCTION");

  parsed.isLocal = false;
  parsed.projectRef = projectRef;
  return parsed;
}

async function assertConnectedIdentity(queryable, parsed) {
  const result = await queryable.query(`
    SELECT
      current_database() AS db_name,
      current_user AS db_user,
      session_user AS session_user,
      COALESCE(inet_server_addr()::text, 'local') AS server_address,
      inet_server_port() AS server_port
  `);
  const identity = result.rows[0];
  if (identity.db_name !== parsed.dbname) {
    throw new Error(`Connected database mismatch: expected ${parsed.dbname}, got ${identity.db_name}`);
  }
  const expectedRole = parsed.expectedConnectedRole || parsed.user;
  if (identity.db_user !== expectedRole || identity.session_user !== expectedRole) {
    throw new Error("Connected database user/session_user does not match the validated URL");
  }
  if (identity.server_port !== parsed.port) {
    throw new Error(`Connected server port mismatch: expected ${parsed.port}, got ${identity.server_port}`);
  }
  return {
    db_name: identity.db_name,
    db_user: identity.db_user,
    session_user: identity.session_user,
    client_user: parsed.user,
    expected_connected_role: expectedRole,
    server_address: identity.server_address,
    server_port: identity.server_port,
    validated_host: parsed.host,
    project_ref: parsed.projectRef,
  };
}

module.exports = {
  PRODUCTION_REF,
  assertConnectedIdentity,
  parseConnectionUrl,
  projectRefFor,
  validateProductionUrl,
  validateRehearsalUrl,
};
