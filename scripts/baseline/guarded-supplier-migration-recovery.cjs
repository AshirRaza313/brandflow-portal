"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { Pool } = require("pg");
const { captureFullCatalog } = require("./capture-full-catalog.cjs");
const { compareCatalogs, writeReport } = require("./compare-catalogs.cjs");
const {
  APPROVED_TABLES,
  canonicalJson,
  repositoryFileSha256,
  sha256,
  structuralSha256,
} = require("./catalog-contract.cjs");
const {
  assertConnectedIdentity,
  validateRehearsalUrl,
} = require("./safety-guard.cjs");
const {
  strictPrismaConnectionUrl,
  strictSupabaseTls,
} = require("./supabase-tls.cjs");
const {
  EXPECTED_ROLES,
  TARGET_MIGRATION,
  assertRequestedMode,
  classifyRecoveryState,
  ownerAndNonTargetAclMatch,
} = require("./classify-supplier-migration-recovery.cjs");

const BASELINE_MIGRATION = "20260101000000_baseline";
const APPROVED_MIGRATIONS = Object.freeze([BASELINE_MIGRATION, TARGET_MIGRATION]);
const EXPECTED_FORWARD_CATALOG_DIFFS = Object.freeze([
  "CONSTRAINT_MISSING_IN_PRODUCTION: suppliers.suppliers_rating_check",
  "CONSTRAINT_MISSING_IN_PRODUCTION: suppliers.suppliers_status_check",
]);
const EVIDENCE_ROOT = path.resolve("backups/supplier-recovery-evidence");
const requestedEvidenceDir = process.env.SUPPLIER_RECOVERY_EVIDENCE_DIR;
if (!requestedEvidenceDir) {
  console.error("SUPPLIER_RECOVERY_EVIDENCE_DIR is required");
  process.exit(1);
}
const EVIDENCE_DIR = path.resolve(requestedEvidenceDir);
if (
  EVIDENCE_DIR === EVIDENCE_ROOT ||
  path.dirname(EVIDENCE_DIR) !== EVIDENCE_ROOT
) {
  console.error("Supplier recovery evidence directory must be a unique direct child of backups/supplier-recovery-evidence");
  process.exit(1);
}
const PRESTATE_FILENAME = "supplier-forward-recovery-prestate.json";
const WRAPPER_PATH = path.resolve(__filename);
const CLASSIFIER_PATH = path.resolve(
  __dirname,
  "classify-supplier-migration-recovery.cjs",
);
const command = process.argv[2];
const ALLOWED_COMMANDS = new Set(["--capture-prestate", "--rolled-back", "--applied"]);
const PRISMA_CHILD_TIMEOUT_MS = 120_000;

if (!ALLOWED_COMMANDS.has(command)) {
  console.error(
    "Usage: node scripts/baseline/guarded-supplier-migration-recovery.cjs " +
      "--capture-prestate|--rolled-back|--applied",
  );
  process.exit(1);
}

const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
if (!parsed.isLocal && process.env.RECOVERY_MAINTENANCE_APPROVED !== "I_UNDERSTAND_WRITERS_AND_MIGRATORS_ARE_PAUSED") {
  console.error(
    "Remote rehearsal recovery requires RECOVERY_MAINTENANCE_APPROVED=I_UNDERSTAND_WRITERS_AND_MIGRATORS_ARE_PAUSED",
  );
  process.exit(1);
}
const connectionString = process.env.REHEARSAL_DATABASE_URL;
const prismaConnectionString = strictPrismaConnectionUrl(
  connectionString,
  parsed.isLocal,
);
process.env.DATABASE_URL = prismaConnectionString;
process.env.DIRECT_DATABASE_URL = prismaConnectionString;

const prismaSchema = path.resolve("prisma/schema.prisma");
const prismaCli = require.resolve("prisma/build/index.js");
const migrationRoot = path.resolve("prisma/migrations");
const fixturePath = path.resolve("tests/fixtures/expected-baseline-catalog.json");

function assertRepositoryTrain() {
  if (!fs.existsSync(prismaSchema) || !fs.existsSync(fixturePath)) {
    throw new Error("Prisma schema or approved baseline fixture is missing");
  }
  const actual = fs
    .readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (JSON.stringify(actual) !== JSON.stringify([...APPROVED_MIGRATIONS].sort())) {
    throw new Error(`Repository migration train must be exactly ${APPROVED_MIGRATIONS.join(", ")}`);
  }
  for (const migration of APPROVED_MIGRATIONS) {
    const sqlPath = path.join(migrationRoot, migration, "migration.sql");
    if (!fs.existsSync(sqlPath)) throw new Error(`Migration SQL is missing: ${migration}`);
  }
}

function assertCleanWorktree() {
  const status = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    { encoding: "utf8" },
  ).trim();
  if (status) {
    throw new Error("Recovery wrapper requires a clean, committed Git worktree");
  }
}

function assertGitSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error(`${label} must be an exact lowercase 40-character Git SHA`);
  }
}

function assertUuid(value, label) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`${label} must be a UUID`);
  }
}

function resolveGitIdentity() {
  const checkoutSha = execFileSync(
    "git",
    ["rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  assertGitSha(checkoutSha, "Checked-out SHA");

  const declaredHead = process.env.PR_HEAD_SHA || checkoutSha;
  const declaredMerge = process.env.MERGE_SHA || checkoutSha;
  assertGitSha(declaredHead, "PR_HEAD_SHA");
  assertGitSha(declaredMerge, "MERGE_SHA");

  if (process.env.GITHUB_ACTIONS === "true") {
    if (declaredMerge !== checkoutSha) {
      throw new Error("MERGE_SHA does not match the checked-out GitHub Actions commit");
    }
    const parents = execFileSync(
      "git",
      ["rev-list", "--parents", "-n", "1", "HEAD"],
      { encoding: "utf8" },
    ).trim().split(/\s+/);
    if (parents.length !== 3 || parents[2] !== declaredHead) {
      throw new Error("PR_HEAD_SHA is not the exact pull-request head parent of the tested merge commit");
    }
  } else if (declaredHead !== checkoutSha || declaredMerge !== checkoutSha) {
    throw new Error("Non-CI recovery provenance must match the exact checked-out commit");
  }

  return {
    sourceHeadSha: declaredHead,
    checkoutSha,
    mergeSha: declaredMerge,
  };
}

function migrationChecksum(migrationName) {
  const migrationPath = path.join(migrationRoot, migrationName, "migration.sql");
  const bytes = fs.readFileSync(migrationPath);
  if (bytes.includes(Buffer.from("\r\n"))) {
    throw new Error(`Migration SQL must be checked out with LF line endings: ${migrationName}`);
  }
  return sha256(bytes);
}

function writeJson(filename, value) {
  const outputPath = path.join(EVIDENCE_DIR, filename);
  fs.writeFileSync(outputPath, `${canonicalJson(value)}\n`);
  return outputPath;
}

function writeEvidenceManifest(gitIdentity, phase) {
  const files = fs
    .readdirSync(EVIDENCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "manifest.json")
    .map((entry) => ({
      path: entry.name,
      size: fs.statSync(path.join(EVIDENCE_DIR, entry.name)).size,
      sha256: sha256(fs.readFileSync(path.join(EVIDENCE_DIR, entry.name))),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return writeJson("manifest.json", {
    evidence_kind: "supplier_migration_recovery_manifest",
    production_recovery_proof: false,
    phase,
    migration_name: TARGET_MIGRATION,
    migration_checksum: migrationChecksum(TARGET_MIGRATION),
    recovery_wrapper_sha256: repositoryFileSha256(WRAPPER_PATH),
    recovery_classifier_sha256: repositoryFileSha256(CLASSIFIER_PATH),
    source_head_sha: gitIdentity.sourceHeadSha,
    checkout_sha: gitIdentity.checkoutSha,
    tested_merge_sha: gitIdentity.mergeSha,
    run_id: process.env.GITHUB_RUN_ID || "local",
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || "local",
    created_at_utc: new Date().toISOString(),
    files,
    files_sha256: sha256(canonicalJson(files)),
  });
}

function createImmutableEvidenceDirectory() {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  if (fs.lstatSync(EVIDENCE_ROOT).isSymbolicLink()) {
    throw new Error("Recovery evidence root must not be a symbolic link");
  }
  if (fs.existsSync(EVIDENCE_DIR)) {
    throw new Error(`Recovery evidence directory already exists: ${EVIDENCE_DIR}`);
  }
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function beginMaintenanceSnapshot(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '10min'");
    await client.query(
      "SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('valtriox_supplier_migration_recovery'))",
    );
    for (const table of [...APPROVED_TABLES].sort()) {
      await client.query(
        `LOCK TABLE public.${quoteIdentifier(table)} IN SHARE ROW EXCLUSIVE MODE`,
      );
    }
    return client;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    throw error;
  }
}

async function closeMaintenanceSnapshot(client, commit) {
  try {
    await client.query(commit ? "COMMIT" : "ROLLBACK");
  } finally {
    client.release();
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function exactTarget(identity) {
  return {
    db_name: identity.db_name,
    db_user: identity.db_user,
    session_user: identity.session_user,
    client_user: identity.client_user,
    expected_connected_role: identity.expected_connected_role,
    server_port: identity.server_port,
    validated_host: identity.validated_host,
    project_ref: identity.project_ref,
  };
}

function assertSameTarget(expected, actual) {
  if (canonicalJson(expected) !== canonicalJson(actual)) {
    throw new Error("Recovery prestate target does not match the connected rehearsal target");
  }
}

async function captureApplicationDataState(pool) {
  const tables = [];
  for (const table of [...APPROVED_TABLES].sort()) {
    const rows = await pool.query(
      `SELECT to_jsonb(row_data)::text AS row_json FROM public.${quoteIdentifier(table)} AS row_data`,
    );
    const canonicalRows = rows.rows.map((row) => row.row_json).sort();
    tables.push({
      table,
      row_count: canonicalRows.length,
      sha256: sha256(canonicalRows.join("\n")),
    });
  }
  return {
    tables,
    aggregate_sha256: sha256(canonicalJson(tables)),
  };
}

async function captureInvalidSupplierCounts(pool) {
  const result = await pool.query(`
    SELECT
      count(*) FILTER (
        WHERE rating IS NOT NULL AND (rating < 1 OR rating > 5)
      )::int AS invalid_rating_count,
      count(*) FILTER (
        WHERE status NOT IN ('active', 'inactive', 'blacklisted')
      )::int AS invalid_status_count
    FROM public.suppliers
  `);
  return result.rows[0];
}

async function captureSupplierState(pool) {
  const constraints = await pool.query(`
    SELECT
      con.conname AS name,
      con.contype AS type,
      con.convalidated AS validated,
      pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
    FROM pg_catalog.pg_constraint AS con
    WHERE con.conrelid = 'public.suppliers'::regclass
      AND con.conname IN ('suppliers_rating_check', 'suppliers_status_check')
    ORDER BY con.conname
  `);
  const posture = await pool.query(`
    SELECT
      pg_catalog.pg_get_userbyid(cls.relowner) AS table_owner,
      cls.relrowsecurity AS rls_enabled,
      cls.relforcerowsecurity AS rls_forced,
      (
        SELECT count(*)::int
        FROM pg_catalog.pg_policy AS policy
        WHERE policy.polrelid = cls.oid
      ) AS policy_count,
      (
        SELECT count(*)::int
        FROM pg_catalog.aclexplode(
          COALESCE(cls.relacl, pg_catalog.acldefault('r', cls.relowner))
        ) AS acl
        WHERE acl.grantee = 0
      ) AS public_table_grant_count,
      (
        SELECT count(*)::int
        FROM pg_catalog.pg_attribute AS attribute
        CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS acl
        WHERE attribute.attrelid = cls.oid
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
          AND acl.grantee = 0
      ) AS public_column_grant_count
    FROM pg_catalog.pg_class AS cls
    WHERE cls.oid = 'public.suppliers'::regclass
  `);
  if (posture.rowCount !== 1) throw new Error("Supplier table security posture is unavailable");

  const tableAcl = await pool.query(`
    SELECT
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl.grantee)
      END AS grantee,
      pg_catalog.pg_get_userbyid(acl.grantor) AS grantor,
      acl.privilege_type,
      acl.is_grantable
    FROM pg_catalog.pg_class AS cls
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(cls.relacl, pg_catalog.acldefault('r', cls.relowner))
    ) AS acl
    WHERE cls.oid = 'public.suppliers'::regclass
    ORDER BY grantee, grantor, acl.privilege_type, acl.is_grantable
  `);
  const columnAcl = await pool.query(`
    SELECT
      attribute.attname AS column_name,
      CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(acl.grantee)
      END AS grantee,
      pg_catalog.pg_get_userbyid(acl.grantor) AS grantor,
      acl.privilege_type,
      acl.is_grantable
    FROM pg_catalog.pg_attribute AS attribute
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS acl
    WHERE attribute.attrelid = 'public.suppliers'::regclass
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
    ORDER BY attribute.attname, grantee, grantor, acl.privilege_type, acl.is_grantable
  `);

  const version = await pool.query(
    "SELECT current_setting('server_version_num')::integer AS server_version_num",
  );
  const tablePrivileges = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ];
  if (version.rows[0].server_version_num >= 170000) tablePrivileges.push("MAINTAIN");

  const roles = [];
  for (const roleName of EXPECTED_ROLES) {
    const role = await pool.query(
      "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
      [roleName],
    );
    if (role.rowCount !== 1) {
      roles.push({
        role: roleName,
        present: false,
        retained_table_privileges: [],
        retained_column_privilege_count: 0,
      });
      continue;
    }
    const retained = await pool.query(
      `
        SELECT privilege
        FROM unnest($2::text[]) AS privileges(privilege)
        WHERE pg_catalog.has_table_privilege(
          $1,
          'public.suppliers'::regclass,
          privilege
        )
        ORDER BY privilege
      `,
      [roleName, tablePrivileges],
    );
    const retainedColumns = await pool.query(
      `
        SELECT count(*)::int AS retained_count
        FROM pg_catalog.pg_attribute AS attribute
        CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'])
          AS privileges(privilege)
        WHERE attribute.attrelid = 'public.suppliers'::regclass
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
          AND pg_catalog.has_column_privilege(
            $1,
            'public.suppliers'::regclass,
            attribute.attname,
            privilege
          )
      `,
      [roleName],
    );
    roles.push({
      role: roleName,
      present: true,
      retained_table_privileges: retained.rows.map((row) => row.privilege),
      retained_column_privilege_count: retainedColumns.rows[0].retained_count,
    });
  }

  return {
    table_owner: posture.rows[0].table_owner,
    table_acl: tableAcl.rows,
    column_acl: columnAcl.rows,
    constraints: constraints.rows,
    rls_enabled: posture.rows[0].rls_enabled,
    rls_forced: posture.rows[0].rls_forced,
    policy_count: posture.rows[0].policy_count,
    public_table_grant_count: posture.rows[0].public_table_grant_count,
    public_column_grant_count: posture.rows[0].public_column_grant_count,
    roles,
  };
}

async function captureCatalogComparison(poolLabel, gitIdentity) {
  const outputPath = path.join(EVIDENCE_DIR, `${poolLabel}-catalog.json`);
  const catalog = await captureFullCatalog({
    connectionString,
    outputPath,
    projectRef: parsed.projectRef,
    headSha: gitIdentity.sourceHeadSha,
    mergeSha: gitIdentity.mergeSha,
    runId: process.env.GITHUB_RUN_ID || "recovery",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || "local",
    expectedConnectedRole: parsed.expectedConnectedRole,
    statementTimeoutMs: 60_000,
    queryTimeoutMs: 75_000,
  });
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const diffs = compareCatalogs(fixture, catalog, {
    production: { sourceKind: "versioned_baseline_fixture" },
    rehearsal: {
      sourceKind: "database_capture",
      projectRef: parsed.projectRef,
      headSha: gitIdentity.sourceHeadSha,
      captureProfile: "generic",
    },
  });
  writeReport(path.join(EVIDENCE_DIR, `${poolLabel}-catalog-diff.txt`), diffs);
  return { catalog, diffs, structural_sha256: structuralSha256(catalog) };
}

async function readHistory(pool) {
  const result = await pool.query(`
    SELECT
      id,
      migration_name,
      checksum,
      pg_catalog.to_char(
        started_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) AS started_at,
      pg_catalog.to_char(
        finished_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) AS finished_at,
      pg_catalog.to_char(
        rolled_back_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) AS rolled_back_at,
      applied_steps_count,
      logs
    FROM public._prisma_migrations
    ORDER BY started_at, migration_name
  `);
  return result.rows.map((row) => ({
    ...row,
    applied_steps_count: Number(row.applied_steps_count),
  }));
}

function assertOnlyApprovedHistoryNames(rows) {
  const unexpected = rows.filter(
    (row) => !APPROVED_MIGRATIONS.includes(row.migration_name),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected migration history row(s): ${unexpected.map((row) => row.migration_name).join(", ")}`,
    );
  }
}

function assertCleanBaselineHistory(rows) {
  assertOnlyApprovedHistoryNames(rows);
  const baselineRows = rows.filter((row) => row.migration_name === BASELINE_MIGRATION);
  if (baselineRows.length !== 1) throw new Error("Recovery requires exactly one baseline history row");
  const row = baselineRows[0];
  assertUuid(row?.id, "Baseline migration history id");
  if (
    row.checksum !== migrationChecksum(BASELINE_MIGRATION) ||
    !row.started_at ||
    !row.finished_at ||
    row.rolled_back_at !== null ||
    Number(row.applied_steps_count) !== 0
  ) {
    throw new Error("Baseline migration history is not clean and exact");
  }
}

function assertExactRolledBackForwardRow(row) {
  assertUuid(row?.id, "Rolled-back migration history id");
  if (
    !row.id ||
    row.migration_name !== TARGET_MIGRATION ||
    row.checksum !== migrationChecksum(TARGET_MIGRATION) ||
    !row.started_at ||
    row.finished_at !== null ||
    !row.rolled_back_at ||
    Number(row.applied_steps_count) !== 0
  ) {
    throw new Error("Prior rolled-back forward migration history is not exact");
  }
}

function assertForwardHistoryReadyForAttempt(rows) {
  assertOnlyApprovedHistoryNames(rows);
  const forwardRows = rows.filter((row) => row.migration_name === TARGET_MIGRATION);
  const unresolved = forwardRows.filter(
    (row) => row.finished_at === null && row.rolled_back_at === null,
  );
  const applied = forwardRows.filter(
    (row) => row.finished_at && row.rolled_back_at === null,
  );
  const priorRolledBack = forwardRows.filter(
    (row) => row.finished_at === null && row.rolled_back_at,
  );
  if (unresolved.length !== 1 || applied.length !== 0) {
    throw new Error("Recovery requires exactly one unresolved forward migration attempt and no applied row");
  }
  for (const row of priorRolledBack) assertExactRolledBackForwardRow(row);
  const historyRow = unresolved[0];
  assertUuid(historyRow?.id, "Unresolved migration history id");
  if (
    !historyRow.id ||
    historyRow.checksum !== migrationChecksum(TARGET_MIGRATION) ||
    !historyRow.started_at ||
    Number(historyRow.applied_steps_count) !== 0
  ) {
    throw new Error("Current unresolved forward migration history is not exact");
  }
  return { historyRow, priorRolledBack };
}

function recoveryStableHistoryFields(row) {
  return {
    id: row.id,
    migration_name: row.migration_name,
    checksum: row.checksum,
    started_at: row.started_at,
    finished_at: row.finished_at,
    applied_steps_count: Number(row.applied_steps_count),
    logs: row.logs,
  };
}

function assertHistoryPrefix(expectedRows, actualRows) {
  if (canonicalJson(expectedRows) !== canonicalJson(actualRows)) {
    throw new Error("Migration history prefix changed after prestate capture");
  }
}

function loadAndVerifyPrestate(identity, gitIdentity) {
  const suppliedPath = process.env.SUPPLIER_RECOVERY_PRESTATE_FILE;
  const expectedHash = process.env.SUPPLIER_RECOVERY_PRESTATE_SHA256;
  if (!suppliedPath || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    throw new Error(
      "SUPPLIER_RECOVERY_PRESTATE_FILE and lowercase SUPPLIER_RECOVERY_PRESTATE_SHA256 are required",
    );
  }
  const resolved = path.resolve(suppliedPath);
  const prestateDirectory = path.dirname(resolved);
  if (
    path.basename(resolved) !== PRESTATE_FILENAME ||
    path.dirname(prestateDirectory) !== EVIDENCE_ROOT ||
    fs.realpathSync(prestateDirectory) !== prestateDirectory
  ) {
    throw new Error("Recovery prestate must be the immutable named file under the recovery evidence root");
  }
  const raw = fs.readFileSync(resolved);
  if (sha256(raw) !== expectedHash) throw new Error("Recovery prestate file SHA-256 mismatch");
  const prestate = JSON.parse(raw.toString("utf8"));
  if (
    prestate.evidence_kind !== "supplier_forward_recovery_prestate" ||
    prestate.migration_name !== TARGET_MIGRATION ||
    prestate.migration_checksum !== migrationChecksum(TARGET_MIGRATION) ||
    prestate.source_head_sha !== gitIdentity.sourceHeadSha ||
    prestate.checkout_sha !== gitIdentity.checkoutSha ||
    prestate.tested_merge_sha !== gitIdentity.mergeSha ||
    prestate.invalid_supplier_counts?.invalid_rating_count !== 0 ||
    prestate.invalid_supplier_counts?.invalid_status_count !== 0 ||
    prestate.recovery_wrapper_sha256 !== repositoryFileSha256(WRAPPER_PATH) ||
    prestate.recovery_classifier_sha256 !== repositoryFileSha256(CLASSIFIER_PATH)
  ) {
    throw new Error("Recovery prestate contract or migration checksum is invalid");
  }
  assertSameTarget(prestate.target, exactTarget(identity));
  if (sha256(canonicalJson(prestate.supplier_state)) !== prestate.supplier_state_sha256) {
    throw new Error("Recovery prestate supplier-state hash is invalid");
  }
  if (
    sha256(canonicalJson(prestate.application_data_state)) !==
      prestate.application_data_state_sha256 ||
    sha256(canonicalJson(prestate.history_prefix)) !== prestate.history_prefix_sha256
  ) {
    throw new Error("Recovery prestate data or history-prefix hash is invalid");
  }
  return { prestate, expectedHash, resolved };
}

function runResolve(flag) {
  const result = spawnSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "resolve",
      "--schema",
      prismaSchema,
      flag,
      TARGET_MIGRATION,
    ],
    {
      encoding: "utf8",
      env: process.env,
      timeout: PRISMA_CHILD_TIMEOUT_MS,
      killSignal: "SIGTERM",
    },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "prisma-migrate-resolve.txt"), output);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    throw new Error(`Prisma migrate resolve could not complete: ${result.error.message}`);
  }
  if (result.signal !== null || result.status !== 0) {
    throw new Error(`Prisma migrate resolve failed with exit code ${String(result.status)}`);
  }
  return {
    exit_code: result.status,
    signal: result.signal,
    output_sha256: sha256(output),
  };
}

function runStatus(label) {
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "status", "--schema", prismaSchema],
    {
      encoding: "utf8",
      env: process.env,
      timeout: PRISMA_CHILD_TIMEOUT_MS,
      killSignal: "SIGTERM",
    },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, `${label}-migrate-status.txt`), output);
  if (result.error) {
    throw new Error(`Prisma migrate status could not complete: ${result.error.message}`);
  }
  return { status: result.status, signal: result.signal, output };
}

function assertExpectedPendingStatus(status) {
  if (
    status.status !== 1 ||
    status.signal !== null ||
    !status.output.includes(TARGET_MIGRATION) ||
    !/(not yet been applied|not in sync)/i.test(status.output) ||
    /(?:\bP\d{4}\b|\berror:|authentication failed|can't reach database|schema engine)/i.test(
      status.output,
    )
  ) {
    throw new Error("Rolled-back recovery did not leave the exact forward-only pending status");
  }
}

function assertPostResolveHistory(rows, flag, beforeRows, currentAttempt, priorRolledBack) {
  assertCleanBaselineHistory(rows);
  assertOnlyApprovedHistoryNames(rows);
  const beforeBaseline = beforeRows.find((row) => row.migration_name === BASELINE_MIGRATION);
  const afterBaseline = rows.find((row) => row.migration_name === BASELINE_MIGRATION);
  if (canonicalJson(beforeBaseline) !== canonicalJson(afterBaseline)) {
    throw new Error("Baseline migration history changed during forward recovery");
  }
  const forwardRows = rows.filter((row) => row.migration_name === TARGET_MIGRATION);
  if (forwardRows.length === 0) throw new Error("Forward migration history disappeared after resolve");
  for (const row of forwardRows) {
    if (row.checksum !== migrationChecksum(TARGET_MIGRATION) || !row.started_at) {
      throw new Error("Forward migration history checksum or started_at drifted");
    }
  }
  const applied = forwardRows.filter(
    (row) => row.finished_at && row.rolled_back_at === null,
  );
  const rolledBack = forwardRows.filter(
    (row) => row.finished_at === null && row.rolled_back_at,
  );
  const unresolved = forwardRows.filter(
    (row) => row.finished_at === null && row.rolled_back_at === null,
  );
  if (unresolved.length !== 0) throw new Error("Resolve left an unfinished history row");
  const afterPrior = priorRolledBack.map((prior) =>
    forwardRows.find((row) => row.id === prior.id),
  );
  if (
    afterPrior.some((row) => !row) ||
    canonicalJson(priorRolledBack) !== canonicalJson(afterPrior)
  ) {
    throw new Error("Prior rolled-back migration attempts changed during resolve");
  }
  const resolvedAttempt = forwardRows.find((row) => row.id === currentAttempt.id);
  if (
    !resolvedAttempt ||
    canonicalJson(recoveryStableHistoryFields(resolvedAttempt)) !==
      canonicalJson(recoveryStableHistoryFields(currentAttempt)) ||
    !resolvedAttempt.rolled_back_at
  ) {
    throw new Error("Resolve did not preserve and roll back the exact unfinished history row");
  }
  if (flag === "--applied") {
    const insertedApplied = applied.find((row) => row.id !== currentAttempt.id);
    if (insertedApplied) {
      assertUuid(insertedApplied.id, "Resolved-applied migration history id");
    }
    if (
      rows.length !== beforeRows.length + 1 ||
      forwardRows.length !== priorRolledBack.length + 2 ||
      applied.length !== 1 ||
      rolledBack.length !== priorRolledBack.length + 1 ||
      !insertedApplied ||
      insertedApplied.id === currentAttempt.id ||
      insertedApplied.started_at !== insertedApplied.finished_at ||
      insertedApplied.logs !== ""
    ) {
      throw new Error("--applied did not produce exactly one clean applied history row");
    }
    if (Number(applied[0].applied_steps_count) !== 0) {
      throw new Error("Resolved-applied migration must have applied_steps_count=0");
    }
  } else if (
    rows.length !== beforeRows.length ||
    forwardRows.length !== priorRolledBack.length + 1 ||
    applied.length !== 0 ||
    rolledBack.length !== priorRolledBack.length + 1
  ) {
    throw new Error("--rolled-back did not mark the exact forward attempt rolled back");
  }
}

async function recordRecoveryFailure({
  pool,
  gitIdentity,
  requestedFlag,
  stage,
  error,
  resolveAttempt,
  historyBefore,
  maintenanceRollbackError,
}) {
  let observedHistory = null;
  let historyObservationError = null;
  if (resolveAttempt.invoked) {
    try {
      observedHistory = await readHistory(pool);
    } catch (historyError) {
      historyObservationError = historyError.message;
    }
  }
  const filename = resolveAttempt.invoked
    ? "recovery-failure-after-resolve.json"
    : "recovery-failure-before-resolve.json";
  writeJson(filename, {
    evidence_kind: "guarded_supplier_recovery_failure",
    production_recovery_proof: false,
    success: false,
    stage,
    resolve_flag: requestedFlag,
    resolve_invoked: resolveAttempt.invoked,
    resolve_exit_zero_observed: resolveAttempt.completed,
    resolve_command_result: resolveAttempt.result,
    migration_name: TARGET_MIGRATION,
    migration_checksum: migrationChecksum(TARGET_MIGRATION),
    git_identity: gitIdentity,
    failed_at_utc: new Date().toISOString(),
    error: {
      name: error.name || "Error",
      message: error.message,
      code: error.code || null,
    },
    maintenance_transaction_rollback_error: maintenanceRollbackError,
    history_before_sha256: historyBefore
      ? sha256(canonicalJson(historyBefore))
      : null,
    history_observed_after_failure: observedHistory,
    history_observation_error: historyObservationError,
    history_observation_may_be_transitional: resolveAttempt.invoked,
    requires_fresh_reclassification: resolveAttempt.invoked,
  });
  writeEvidenceManifest(
    gitIdentity,
    resolveAttempt.invoked ? "resolve-postcheck-failed" : "pre-resolve-rejected",
  );
}

async function capturePrestate(pool, identity, gitIdentity) {
  createImmutableEvidenceDirectory();
  let client = await beginMaintenanceSnapshot(pool);
  try {
    const history = await readHistory(client);
    assertCleanBaselineHistory(history);
    const forwardRows = history.filter((row) => row.migration_name === TARGET_MIGRATION);
    if (
      forwardRows.some((row) => row.finished_at || !row.rolled_back_at) ||
      forwardRows.some((row) => {
        try {
          assertExactRolledBackForwardRow(row);
          return false;
        } catch {
          return true;
        }
      })
    ) {
      throw new Error("Prestate capture permits only exact prior rolled-back forward attempts");
    }
    const supplierState = await captureSupplierState(client);
    if (supplierState.constraints.length !== 0) {
      throw new Error("Prestate capture requires both forward constraints to be absent");
    }
    if (
      supplierState.rls_enabled ||
      supplierState.rls_forced ||
      supplierState.policy_count !== 0 ||
      supplierState.roles.some((role) => role.present !== true)
    ) {
      throw new Error(
        "Prestate capture requires disabled/unforced RLS, zero policies, and all expected roles",
      );
    }
    const catalog = await captureCatalogComparison("prestate", gitIdentity);
    if (catalog.diffs.length !== 0) {
      throw new Error("Prestate capture requires exact approved baseline catalog parity");
    }
    const applicationDataState = await captureApplicationDataState(client);
    const invalidSupplierCounts = await captureInvalidSupplierCounts(client);
    if (
      invalidSupplierCounts.invalid_rating_count !== 0 ||
      invalidSupplierCounts.invalid_status_count !== 0
    ) {
      throw new Error("Prestate capture requires zero invalid Supplier rating/status rows");
    }
    const prestate = {
      evidence_kind: "supplier_forward_recovery_prestate",
      production_recovery_proof: false,
      migration_name: TARGET_MIGRATION,
      migration_checksum: migrationChecksum(TARGET_MIGRATION),
      captured_at_utc: new Date().toISOString(),
      source_head_sha: gitIdentity.sourceHeadSha,
      checkout_sha: gitIdentity.checkoutSha,
      tested_merge_sha: gitIdentity.mergeSha,
      recovery_wrapper_sha256: repositoryFileSha256(WRAPPER_PATH),
      recovery_classifier_sha256: repositoryFileSha256(CLASSIFIER_PATH),
      target: exactTarget(identity),
      maintenance_protocol: "application_tables_share_row_exclusive_and_advisory_lock",
      history_prefix: history,
      history_prefix_sha256: sha256(canonicalJson(history)),
      baseline_catalog_sha256: catalog.structural_sha256,
      supplier_state: supplierState,
      supplier_state_sha256: sha256(canonicalJson(supplierState)),
      application_data_state: applicationDataState,
      application_data_state_sha256: sha256(canonicalJson(applicationDataState)),
      invalid_supplier_counts: invalidSupplierCounts,
    };
    const outputPath = writeJson(PRESTATE_FILENAME, prestate);
    const fileHash = sha256(fs.readFileSync(outputPath));
    writeJson("prestate-receipt.json", {
      prestate_file: PRESTATE_FILENAME,
      prestate_sha256: fileHash,
      target: prestate.target,
      migration_name: TARGET_MIGRATION,
    });
    await closeMaintenanceSnapshot(client, true);
    client = null;
    writeEvidenceManifest(gitIdentity, "prestate");
    console.log(`Recovery prestate captured: ${outputPath}`);
    console.log(`SUPPLIER_RECOVERY_PRESTATE_SHA256=${fileHash}`);
  } finally {
    if (client) await closeMaintenanceSnapshot(client, false);
  }
}

async function recover(pool, identity, gitIdentity, requestedFlag) {
  createImmutableEvidenceDirectory();
  const { prestate, expectedHash, resolved } = loadAndVerifyPrestate(identity, gitIdentity);
  let client = await beginMaintenanceSnapshot(pool);
  let stage = "pre-resolve-validation";
  let historyBeforeForReceipt = null;
  const resolveAttempt = { invoked: false, completed: false, result: null };
  try {
    const beforeHistory = await readHistory(client);
    historyBeforeForReceipt = beforeHistory;
    assertCleanBaselineHistory(beforeHistory);
    if (beforeHistory.length !== prestate.history_prefix.length + 1) {
      throw new Error("Recovery history must equal the captured prefix plus one unresolved attempt");
    }
    const prefixById = prestate.history_prefix.map((expected) =>
      beforeHistory.find((row) => row.id === expected.id),
    );
    if (prefixById.some((row) => !row)) {
      throw new Error("A prestate migration-history row is missing");
    }
    assertHistoryPrefix(prestate.history_prefix, prefixById);
    const { historyRow, priorRolledBack } = assertForwardHistoryReadyForAttempt(beforeHistory);
    if (priorRolledBack.length !== prestate.history_prefix.length - 1) {
      throw new Error("Prior rolled-back history count does not match the captured prestate");
    }

    const beforeState = await captureSupplierState(client);
    const beforeCatalog = await captureCatalogComparison("before-recovery", gitIdentity);
    const dataBefore = await captureApplicationDataState(client);
    if (canonicalJson(dataBefore) !== canonicalJson(prestate.application_data_state)) {
      throw new Error("Application data fingerprints changed since the approved prestate");
    }
    const prestateMatches =
      sha256(canonicalJson(beforeState)) === prestate.supplier_state_sha256 &&
      beforeCatalog.structural_sha256 === prestate.baseline_catalog_sha256;
    const forwardCatalogMatches =
      JSON.stringify([...beforeCatalog.diffs].sort()) ===
      JSON.stringify([...EXPECTED_FORWARD_CATALOG_DIFFS].sort());
    const classification = classifyRecoveryState({
      historyRow,
      expectedChecksum: migrationChecksum(TARGET_MIGRATION),
      constraints: beforeState.constraints,
      security: {
        ...beforeState,
        owner_acl_matches: ownerAndNonTargetAclMatch(prestate.supplier_state, beforeState),
      },
      baselineCatalogMatches: beforeCatalog.diffs.length === 0,
      forwardCatalogMatches,
      prestateMatches,
    });
    assertRequestedMode(classification, requestedFlag);
    writeJson("classification-before-resolve.json", {
      ...classification,
      requested_flag: requestedFlag,
      migration_name: TARGET_MIGRATION,
      migration_checksum: migrationChecksum(TARGET_MIGRATION),
      prestate_file: path.basename(resolved),
      prestate_sha256: expectedHash,
      target: exactTarget(identity),
      git_identity: gitIdentity,
      maintenance_protocol: "application_tables_share_row_exclusive_and_advisory_lock",
      history: beforeHistory,
      supplier_state: beforeState,
      application_data_state: dataBefore,
      catalog_diffs: beforeCatalog.diffs,
    });

    const immediatelyBeforeResolve = await readHistory(client);
    if (canonicalJson(beforeHistory) !== canonicalJson(immediatelyBeforeResolve)) {
      throw new Error("Migration history changed after classification and before resolve");
    }
    stage = "prisma-resolve";
    resolveAttempt.invoked = true;
    resolveAttempt.result = runResolve(requestedFlag);
    resolveAttempt.completed = true;
    writeJson("resolve-command-result.json", {
      evidence_kind: "supplier_migration_resolve_command_result",
      resolve_flag: requestedFlag,
      migration_name: TARGET_MIGRATION,
      migration_checksum: migrationChecksum(TARGET_MIGRATION),
      history_before_sha256: sha256(canonicalJson(beforeHistory)),
      completed_at_utc: new Date().toISOString(),
      ...resolveAttempt.result,
    });

    stage = "post-resolve-verification";
    const afterHistory = await readHistory(client);
    assertPostResolveHistory(
      afterHistory,
      requestedFlag,
      beforeHistory,
      historyRow,
      priorRolledBack,
    );
    const afterState = await captureSupplierState(client);
    const afterCatalog = await captureCatalogComparison("after-recovery", gitIdentity);
    const dataAfter = await captureApplicationDataState(client);
    if (canonicalJson(beforeState) !== canonicalJson(afterState)) {
      throw new Error("Supplier schema/security state changed during migrate resolve");
    }
    if (beforeCatalog.structural_sha256 !== afterCatalog.structural_sha256) {
      throw new Error("Application catalog changed during migrate resolve");
    }
    if (canonicalJson(dataBefore) !== canonicalJson(dataAfter)) {
      throw new Error("Application data fingerprints changed during migrate resolve");
    }
    const status = runStatus("after-recovery");
    if (
      requestedFlag === "--applied" &&
      (status.status !== 0 || status.signal !== null)
    ) {
      throw new Error("Migration status is not clean after committed-SQL --applied recovery");
    }
    if (requestedFlag === "--rolled-back") assertExpectedPendingStatus(status);
    writeJson("recovery-result.json", {
      evidence_kind: "guarded_supplier_rehearsal_recovery",
      production_recovery_proof: false,
      classification: classification.classification,
      resolve_flag: requestedFlag,
      migration_name: TARGET_MIGRATION,
      migration_checksum: migrationChecksum(TARGET_MIGRATION),
      target: exactTarget(identity),
      git_identity: gitIdentity,
      history_before: beforeHistory,
      history_after: afterHistory,
      application_data_state_before: dataBefore,
      application_data_state_after: dataAfter,
      catalog_sha256_before: beforeCatalog.structural_sha256,
      catalog_sha256_after: afterCatalog.structural_sha256,
      supplier_state_sha256: sha256(canonicalJson(afterState)),
      migrate_status_exit_code: status.status,
    });
    await closeMaintenanceSnapshot(client, true);
    client = null;
    stage = "success-evidence-manifest";
    writeEvidenceManifest(gitIdentity, "resolve");
    console.log(`Guarded Supplier recovery completed with ${requestedFlag}`);
  } catch (error) {
    let maintenanceRollbackError = null;
    if (client) {
      try {
        await closeMaintenanceSnapshot(client, false);
      } catch (rollbackError) {
        maintenanceRollbackError = rollbackError.message;
      }
      client = null;
    }
    try {
      await recordRecoveryFailure({
        pool,
        gitIdentity,
        requestedFlag,
        stage,
        error,
        resolveAttempt,
        historyBefore: historyBeforeForReceipt,
        maintenanceRollbackError,
      });
    } catch (receiptError) {
      console.error(`Could not write recovery failure receipt: ${receiptError.message}`);
    }
    throw error;
  } finally {
    if (client) await closeMaintenanceSnapshot(client, false);
  }
}

async function main() {
  assertRepositoryTrain();
  assertCleanWorktree();
  const gitIdentity = resolveGitIdentity();
  const pool = new Pool({
    connectionString,
    ssl: strictSupabaseTls(connectionString, parsed.isLocal),
    connectionTimeoutMillis: 15_000,
    query_timeout: 75_000,
  });
  try {
    const identity = await assertConnectedIdentity(pool, parsed);
    if (command === "--capture-prestate") {
      await capturePrestate(pool, identity, gitIdentity);
    } else {
      await recover(pool, identity, gitIdentity, command);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
