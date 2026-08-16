// scripts/baseline/safety-guard.cjs
// Shared safety guard for baseline scripts.
// Validates REHEARSAL_DATABASE_URL and PRODUCTION_DATABASE_URL.
// Uses URL parsing (not substring matching) for exact hostname verification.

"use strict";

/**
 * Parse a PostgreSQL connection string into components.
 * Handles postgresql:// and postgres:// schemes.
 * Returns { host, port, dbname, user } or null on failure.
 */
function parseConnectionUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    // Strip protocol: postgres:// or postgresql://
    var cleaned = url.replace(/^postgres(ql)?(s)?:\/\//, "");
    if (!cleaned) return null;

    var atIdx = cleaned.indexOf("@");
    if (atIdx < 0) return null;

    var credentials = cleaned.substring(0, atIdx);
    var rest = cleaned.substring(atIdx + 1);
    var slashIdx = rest.indexOf("/");
    if (slashIdx < 0) return null;

    var hostPort = rest.substring(0, slashIdx);
    var dbname = rest.substring(slashIdx + 1).split("?")[0];

    // Handle IPv6 [::1] hostnames and regular host:port
    var host, port;
    if (hostPort.startsWith("[")) {
      var bracketEnd = hostPort.indexOf("]");
      host = hostPort.substring(0, bracketEnd + 1);
      var afterBracket = hostPort.substring(bracketEnd + 1);
      port = afterBracket.startsWith(":")
        ? parseInt(afterBracket.substring(1), 10)
        : 5432;
    } else {
      var lastColon = hostPort.lastIndexOf(":");
      if (lastColon >= 0) {
        host = hostPort.substring(0, lastColon);
        port = parseInt(hostPort.substring(lastColon + 1), 10);
      } else {
        host = hostPort;
        port = 5432;
      }
    }

    var user = credentials.split(":")[0];

    if (!host || !dbname || !user || isNaN(port)) return null;

    return { host: host, port: port, dbname: dbname, user: user };
  } catch (e) {
    return null;
  }
}

/**
 * Validate REHEARSAL_DATABASE_URL against safety rules.
 *
 * Rules:
 * 1. Production hostnames (exact match) ALWAYS rejected.
 * 2. Production pooler hostnames (exact suffix match) ALWAYS rejected.
 * 3. CI (GITHUB_ACTIONS=true): only localhost/127.0.0.1, port 5432,
 *    dbname valtriox_test, user valtriox_test allowed.
 * 4. Non-CI: hostname must end with .supabase.co.
 *    Production project ref (wqwsagnxkamblnefhpzx) ALWAYS rejected.
 *    Staging allowlist checked via ALLOWED_STAGING_REFS env var (comma-separated).
 *
 * Returns parsed { host, port, dbname, user, isLocal } on success.
 * Calls process.exit(1) on any validation failure.
 */
function validateRehearsalUrl(envVar) {
  var url = process.env[envVar];
  if (!url) {
    console.error(envVar + " not set");
    process.exit(1);
  }

  var parsed = parseConnectionUrl(url);
  if (!parsed) {
    console.error(envVar + ": invalid connection string format");
    process.exit(1);
  }

  var host = parsed.host;
  var port = parsed.port;
  var dbname = parsed.dbname;
  var user = parsed.user;
  var isLocal = (host === "localhost" || host === "127.0.0.1");

  // --- Rule 1: Production hostname exact match - ALWAYS REJECT ---
  var PRODUCTION_HOSTS = [
    "db.wqwsagnxkamblnefhpzx.supabase.co",
  ];
  if (PRODUCTION_HOSTS.indexOf(host) !== -1) {
    console.error(envVar + ": production database rejected (exact hostname match)");
    process.exit(1);
  }

  // --- Rule 2: Production pooler exact suffix match - ALWAYS REJECT ---
  // CodeQL fix: use endsWith instead of indexOf for exact suffix matching.
  // Prevents partial match on adversarial hostnames like evil.pooler.supabase.com.attacker.com.
  if (host.endsWith(".pooler.supabase.com")) {
    console.error(envVar + ": production pooler connection rejected (exact suffix match)");
    process.exit(1);
  }

  var isCI = process.env.GITHUB_ACTIONS === "true";

  if (isCI) {
    // --- Rule 3: CI - strict localhost/127.0.0.1 with exact test credentials ---
    var allowedCIHosts = ["localhost", "127.0.0.1"];
    if (allowedCIHosts.indexOf(host) === -1) {
      console.error(
        envVar + ": CI hostname must be localhost or 127.0.0.1, got \"" + host + "\""
      );
      process.exit(1);
    }
    if (port !== 5432) {
      console.error(envVar + ": CI port must be 5432, got " + port);
      process.exit(1);
    }
    if (dbname !== "valtriox_test") {
      console.error(
        envVar + ": CI database must be valtriox_test, got \"" + dbname + "\""
      );
      process.exit(1);
    }
    if (user !== "valtriox_test") {
      console.error(
        envVar + ": CI user must be valtriox_test, got \"" + user + "\""
      );
      process.exit(1);
    }
  } else {
    // --- Rule 4: Non-CI - must be Supabase with staging allowlist ---
    if (!host.endsWith(".supabase.co")) {
      console.error(
        envVar + ": must point to a Supabase database (hostname must end with .supabase.co)"
      );
      process.exit(1);
    }

    // Extract project ref from hostname patterns:
    //   db.<ref>.supabase.co  or  <ref>.supabase.co
    var refMatch = host.match(/^(db\.)?([a-z0-9]+)\.supabase\.co$/);
    if (refMatch) {
      var projectRef = refMatch[2];

      // Always reject production project ref
      if (projectRef === "wqwsagnxkamblnefhpzx") {
        console.error(envVar + ": production project ref rejected");
        process.exit(1);
      }

      // Check staging allowlist if ALLOWED_STAGING_REFS is defined
      var stagingRefs = (process.env.ALLOWED_STAGING_REFS || "")
        .split(",")
        .filter(Boolean);
      if (stagingRefs.length > 0 && stagingRefs.indexOf(projectRef) === -1) {
        console.error(
          envVar + ": project ref \"" + projectRef + "\" not in staging allowlist (set ALLOWED_STAGING_REFS)"
        );
        process.exit(1);
      }
    }
  }

  parsed.isLocal = isLocal;
  return parsed;
}

/**
 * Validate PRODUCTION_DATABASE_URL for production-read scripts.
 * Ensures connection points ONLY to the known production project.
 *
 * Rules:
 * 1. Port must be 5432 (session pooler), rejects 6543 (transaction pooler).
 * 2. Host must be either:
 *    a. Direct: db.wqwsagnxkamblnefhpzx.supabase.co
 *    b. Session pooler: *.pooler.supabase.com with user matching production ref.
 * 3. Rehearsal project ref (igyqgchgfmcfvjmakvyk) ALWAYS rejected.
 * 4. Any other host or ref ALWAYS rejected.
 *
 * Returns parsed { host, port, dbname, user, isLocal } on success.
 * Calls process.exit(1) on any validation failure.
 */
function validateProductionUrl(envVar) {
  var url = process.env[envVar];
  if (!url) {
    console.error(envVar + " not set");
    process.exit(1);
  }

  var parsed = parseConnectionUrl(url);
  if (!parsed) {
    console.error(envVar + ": invalid connection string format");
    process.exit(1);
  }

  var host = parsed.host;
  var port = parsed.port;
  var user = parsed.user;
  var PRODUCTION_REF = "wqwsagnxkamblnefhpzx";
  var REHEARSAL_REF = "igyqgchgfmcfvjmakvyk";

  // Reject transaction pooler port
  if (port === 6543) {
    console.error(envVar + ": transaction pooler port 6543 rejected, use session pooler port 5432");
    process.exit(1);
  }
  if (port !== 5432) {
    console.error(envVar + ": port must be 5432 (session pooler), got " + port);
    process.exit(1);
  }

  // Pattern 1: Direct production host
  var directHost = "db." + PRODUCTION_REF + ".supabase.co";
  if (host === directHost) {
    console.log(envVar + ": production direct connection validated (ref: " + PRODUCTION_REF + ")");
    parsed.isLocal = false;
    return parsed;
  }

  // Pattern 2: Production session pooler
  // Hostname must end with .pooler.supabase.com (exact suffix, not substring).
  // User must exactly match production ref patterns to prevent cross-project access.
  if (host.endsWith(".pooler.supabase.com")) {
    var expectedUserDirect = PRODUCTION_REF;
    var expectedUserPg = "postgres." + PRODUCTION_REF;

    if (user === expectedUserDirect || user === expectedUserPg) {
      console.log(envVar + ": production session pooler validated (host: " + host + ", ref: " + PRODUCTION_REF + ")");
      parsed.isLocal = false;
      return parsed;
    }

    // Reject rehearsal ref explicitly
    if (user === REHEARSAL_REF || user === "postgres." + REHEARSAL_REF) {
      console.error(envVar + ": rehearsal project ref rejected on production pooler connection");
      process.exit(1);
    }

    console.error(
      envVar + ": pooler user must contain production ref \"" + PRODUCTION_REF +
      "\", got user \"" + user + "\""
    );
    process.exit(1);
  }

  // Reject rehearsal direct host
  var rehearsalHost = "db." + REHEARSAL_REF + ".supabase.co";
  if (host === rehearsalHost) {
    console.error(envVar + ": rehearsal database rejected on production URL");
    process.exit(1);
  }

  console.error(
    envVar + ": must point to production database (db." + PRODUCTION_REF +
    ".supabase.co or session pooler), got host \"" + host + "\""
  );
  process.exit(1);
}

module.exports = {
  parseConnectionUrl: parseConnectionUrl,
  validateRehearsalUrl: validateRehearsalUrl,
  validateProductionUrl: validateProductionUrl
};