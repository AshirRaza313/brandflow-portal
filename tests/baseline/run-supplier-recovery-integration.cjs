"use strict";

// This CI-only runner exercises guarded recovery against disposable localhost
// PostgreSQL and emits immutable, hash-bound evidence for every attempt.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { Pool } = require("pg");
const {
  APPROVED_TABLES,
  canonicalJson,
  repositoryFileSha256,
  sha256,
} = require("../../scripts/baseline/catalog-contract.cjs");
const {
  EXPECTED_ROLES,
  hasExactCommittedConstraints,
  hasExactDeniedPosture,
} = require("../../scripts/baseline/classify-supplier-migration-recovery.cjs");
const {
  assertConnectedIdentity,
  validateRehearsalUrl,
} = require("../../scripts/baseline/safety-guard.cjs");
const {
  strictPrismaConnectionUrl,
  strictSupabaseTls,
} = require("../../scripts/baseline/supabase-tls.cjs");

const BASELINE_MIGRATION = "20260101000000_baseline";
const FORWARD_MIGRATION = "20260815_add_supplier_constraints_and_security";
const rawConnectionString = process.env.REHEARSAL_DATABASE_URL;
const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
const connectionString = strictPrismaConnectionUrl(rawConnectionString, parsed.isLocal);

// Bind raw Prisma children immediately to the exact URL that passed validation.
process.env.DATABASE_URL = connectionString;
process.env.DIRECT_DATABASE_URL = connectionString;

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const node = process.execPath;
const integrationRoot = path.resolve("backups/supplier-recovery-integration");
const wrapperRoot = path.resolve("backups/supplier-recovery-evidence");
const baselineSchema = path.resolve("backups/baseline-only-prisma/schema.prisma");
const migrationSql = fs.readFileSync(
  path.resolve("prisma/migrations", FORWARD_MIGRATION, "migration.sql"),
  "utf8",
);
const migrationChecksum = sha256(Buffer.from(migrationSql));
const recoveryWrapperPath = path.resolve(
  "scripts/baseline/guarded-supplier-migration-recovery.cjs",
);
const recoveryClassifierPath = path.resolve(
  "scripts/baseline/classify-supplier-migration-recovery.cjs",
);
const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const headSha = process.env.PR_HEAD_SHA || checkoutSha;
const mergeSha = process.env.MERGE_SHA || checkoutSha;
const runId = process.env.GITHUB_RUN_ID || "local";
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "local";
const COMMAND_TIMEOUT_MS = 180_000;

if (!parsed.isLocal || process.env.CI !== "true" || process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Supplier recovery integration is allowed only on exact GitHub CI localhost");
}

function fail(message) {
  throw new Error(message);
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function scenarioPath(scenario, filename) {
  return path.join(integrationRoot, scenario, filename);
}

function writeImmutable(outputPath, value) {
  if (fs.existsSync(outputPath)) fail(`Refusing to overwrite evidence: ${outputPath}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, value);
}

function writeJson(outputPath, value) {
  writeImmutable(outputPath, `${canonicalJson(value)}\n`);
}

function run(command, args, extraEnv = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    timeout: COMMAND_TIMEOUT_MS,
    killSignal: "SIGTERM",
  });
}

function runCaptured(command, args, outputPath, extraEnv = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    timeout: COMMAND_TIMEOUT_MS,
    killSignal: "SIGTERM",
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const status = Number.isInteger(result.status) ? result.status : null;
  const signal = result.signal || null;
  const spawnError = result.error ? String(result.error.message || result.error) : null;
  writeImmutable(
    outputPath,
    `exit_code=${status}\nsignal=${signal || "none"}\nspawn_error=${spawnError || "none"}\n` +
      `[stdout]\n${stdout}\n[stderr]\n${stderr}\n`,
  );
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (result.error) throw result.error;
  return { status, signal, spawnError, combined: `${stdout}\n${stderr}` };
}

function runSuccess(command, args, outputPath, extraEnv = {}) {
  const result = runCaptured(command, args, outputPath, extraEnv);
  if (result.status !== 0 || result.signal !== null) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
  return result;
}

function runFailure(command, args, outputPath, extraEnv = {}) {
  const result = runCaptured(command, args, outputPath, extraEnv);
  if (
    !Number.isInteger(result.status) ||
    result.status <= 0 ||
    result.signal !== null
  ) {
    fail(`Expected a normal nonzero exit: ${command} ${args.join(" ")}`);
  }
  return result;
}

function newWrapperDir(label) {
  const safe = label.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return path.join(wrapperRoot, `${safe}-${runId}-${runAttempt}-${crypto.randomUUID()}`);
}

function verifyWrapperManifest(directory) {
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) fail(`Wrapper manifest missing: ${directory}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== "manifest.json")
    .map((entry) => ({
      path: entry.name,
      size: fs.statSync(path.join(directory, entry.name)).size,
      sha256: sha256(fs.readFileSync(path.join(directory, entry.name))),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (
    manifest.evidence_kind !== "supplier_migration_recovery_manifest" ||
    manifest.production_recovery_proof !== false ||
    manifest.migration_name !== FORWARD_MIGRATION ||
    manifest.migration_checksum !== migrationChecksum ||
    manifest.source_head_sha !== headSha ||
    manifest.checkout_sha !== mergeSha ||
    manifest.tested_merge_sha !== mergeSha ||
    manifest.run_id !== runId ||
    manifest.run_attempt !== runAttempt ||
    manifest.recovery_wrapper_sha256 !== repositoryFileSha256(recoveryWrapperPath) ||
    manifest.recovery_classifier_sha256 !== repositoryFileSha256(recoveryClassifierPath) ||
    canonicalJson(manifest.files) !== canonicalJson(files) ||
    manifest.files_sha256 !== sha256(canonicalJson(files))
  ) {
    fail(`Wrapper manifest metadata or file hashes are invalid: ${directory}`);
  }
}

function preserveWrapper(source, destination) {
  if (!fs.existsSync(source) || fs.readdirSync(source).length === 0) {
    fail(`Wrapper evidence missing or empty: ${source}`);
  }
  verifyWrapperManifest(source);
  if (fs.existsSync(destination)) fail(`Preserved evidence already exists: ${destination}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, errorOnExist: true });
}

function wrapperEnv(directory, prestate) {
  const env = { SUPPLIER_RECOVERY_EVIDENCE_DIR: directory };
  if (prestate) {
    env.SUPPLIER_RECOVERY_PRESTATE_FILE = prestate.path;
    env.SUPPLIER_RECOVERY_PRESTATE_SHA256 = prestate.sha256;
  }
  return env;
}

function capturePrestate(scenario, phase) {
  const source = newWrapperDir(`${scenario}-${phase}`);
  run(
    node,
    ["scripts/baseline/guarded-supplier-migration-recovery.cjs", "--capture-prestate"],
    wrapperEnv(source),
  );
  preserveWrapper(source, scenarioPath(scenario, `${phase}-wrapper-evidence`));
  const receipt = JSON.parse(fs.readFileSync(path.join(source, "prestate-receipt.json"), "utf8"));
  const prestatePath = path.join(source, receipt.prestate_file);
  if (sha256(fs.readFileSync(prestatePath)) !== receipt.prestate_sha256) {
    fail("Prestate receipt hash mismatch");
  }
  return { path: prestatePath, sha256: receipt.prestate_sha256 };
}

function recover(scenario, phase, flag, prestate) {
  const source = newWrapperDir(`${scenario}-${phase}`);
  run(
    node,
    ["scripts/baseline/guarded-supplier-migration-recovery.cjs", flag],
    wrapperEnv(source, prestate),
  );
  preserveWrapper(source, scenarioPath(scenario, `${phase}-wrapper-evidence`));
}

function rejectRecovery(scenario, phase, flag, prestate) {
  const source = newWrapperDir(`${scenario}-${phase}`);
  const result = runFailure(
    node,
    ["scripts/baseline/guarded-supplier-migration-recovery.cjs", flag],
    scenarioPath(scenario, `${phase}-output.txt`),
    wrapperEnv(source, prestate),
  );
  preserveWrapper(source, scenarioPath(scenario, `${phase}-wrapper-evidence`));
  return result;
}

async function resetDatabase(pool) {
  await pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public AUTHORIZATION valtriox_test;
    GRANT ALL ON SCHEMA public TO valtriox_test;
    GRANT ALL ON SCHEMA public TO PUBLIC;
    DROP ROLE IF EXISTS anon;
    DROP ROLE IF EXISTS authenticated;
    DROP ROLE IF EXISTS service_role;
  `);
}

function prepareBaseline() {
  run(node, ["scripts/baseline/replay-baseline.cjs"]);
  run(node, ["scripts/baseline/prepare-pathb-ci-roles.cjs"]);
  run(node, ["scripts/baseline/seed-rehearsal-for-pathb.cjs"]);
  run(npx, [
    "prisma", "migrate", "resolve", "--schema", baselineSchema,
    "--applied", BASELINE_MIGRATION,
  ]);
}

async function readHistory(pool) {
  const result = await pool.query(`
    SELECT id, migration_name, checksum,
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
           applied_steps_count, logs
    FROM public._prisma_migrations
    ORDER BY started_at, id
  `);
  return result.rows.map((row) => ({
    ...row,
    applied_steps_count: Number(row.applied_steps_count),
  }));
}

function forwardRows(history) {
  return history.filter((row) => row.migration_name === FORWARD_MIGRATION);
}

function unresolvedRows(history) {
  return forwardRows(history).filter(
    (row) => row.finished_at === null && row.rolled_back_at === null,
  );
}

function assertUnchanged(before, after, label) {
  if (canonicalJson(before) !== canonicalJson(after)) fail(`${label} mutated history`);
}

function assertOnlyRolledBack(before, after, label) {
  if (!after || after.id !== before.id || !after.rolled_back_at) {
    fail(`${label} did not retain and roll back the exact row ID`);
  }
  if (canonicalJson(before) !== canonicalJson({ ...after, rolled_back_at: null })) {
    fail(`${label} changed fields other than rolled_back_at`);
  }
}

function assertAppliedRow(row, steps, label) {
  if (
    !row || !row.id || row.checksum !== migrationChecksum || !row.started_at ||
    !row.finished_at || row.rolled_back_at !== null ||
    row.applied_steps_count !== steps ||
    (steps === 0 ? row.logs !== "" : row.logs !== null && row.logs !== "")
  ) fail(`${label} is not an exact applied row`);
}

async function captureData(pool) {
  const tables = [];
  for (const table of [...APPROVED_TABLES].sort()) {
    const result = await pool.query(
      `SELECT to_jsonb(row_data)::text AS row_json FROM public.${quoteIdentifier(table)} AS row_data`,
    );
    const rows = result.rows.map((row) => row.row_json).sort();
    tables.push({ table, row_count: rows.length, sha256: sha256(rows.join("\n")) });
  }
  return { tables, aggregate_sha256: sha256(canonicalJson(tables)) };
}

async function captureSecurity(pool) {
  const constraints = await pool.query(`
    SELECT con.conname AS name, con.contype AS type,
           con.convalidated AS validated,
           pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
    FROM pg_catalog.pg_constraint AS con
    WHERE con.conrelid = 'public.suppliers'::regclass
      AND con.conname IN ('suppliers_rating_check', 'suppliers_status_check')
    ORDER BY con.conname
  `);
  const posture = await pool.query(`
    SELECT pg_catalog.pg_get_userbyid(cls.relowner) AS table_owner,
           cls.relrowsecurity AS rls_enabled,
           cls.relforcerowsecurity AS rls_forced,
      (SELECT count(*)::int FROM pg_catalog.pg_policy p
       WHERE p.polrelid = cls.oid) AS policy_count,
      (SELECT count(*)::int FROM pg_catalog.aclexplode(
         COALESCE(cls.relacl, pg_catalog.acldefault('r', cls.relowner))) acl
       WHERE acl.grantee = 0) AS public_table_grant_count,
      (SELECT count(*)::int FROM pg_catalog.pg_attribute a
       CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl
       WHERE a.attrelid = cls.oid AND a.attnum > 0 AND NOT a.attisdropped
         AND acl.grantee = 0) AS public_column_grant_count
    FROM pg_catalog.pg_class cls
    WHERE cls.oid = 'public.suppliers'::regclass
  `);
  if (posture.rowCount !== 1) fail("Supplier security posture is unavailable");
  const tableAcl = await pool.query(`
    SELECT CASE WHEN acl.grantee=0 THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS grantee,
           pg_catalog.pg_get_userbyid(acl.grantor) AS grantor,
           acl.privilege_type, acl.is_grantable
    FROM pg_catalog.pg_class cls
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(cls.relacl, pg_catalog.acldefault('r', cls.relowner))) acl
    WHERE cls.oid='public.suppliers'::regclass
    ORDER BY grantee, grantor, acl.privilege_type, acl.is_grantable
  `);
  const columnAcl = await pool.query(`
    SELECT a.attname AS column_name,
           CASE WHEN acl.grantee=0 THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS grantee,
           pg_catalog.pg_get_userbyid(acl.grantor) AS grantor,
           acl.privilege_type, acl.is_grantable
    FROM pg_catalog.pg_attribute a
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) acl
    WHERE a.attrelid='public.suppliers'::regclass
      AND a.attnum>0 AND NOT a.attisdropped
    ORDER BY a.attname, grantee, grantor, acl.privilege_type, acl.is_grantable
  `);
  const version = await pool.query(
    "SELECT current_setting('server_version_num')::integer AS version",
  );
  const privileges = [
    "SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER",
  ];
  if (version.rows[0].version >= 170000) privileges.push("MAINTAIN");
  const roles = [];
  for (const roleName of EXPECTED_ROLES) {
    const present = await pool.query(
      "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
      [roleName],
    );
    if (present.rowCount !== 1) {
      roles.push({
        role: roleName,
        present: false,
        retained_table_privileges: [],
        retained_column_privilege_count: 0,
      });
      continue;
    }
    const retained = await pool.query(`
      SELECT privilege FROM unnest($2::text[]) AS privileges(privilege)
      WHERE pg_catalog.has_table_privilege(
        $1, 'public.suppliers'::regclass, privilege
      ) ORDER BY privilege
    `, [roleName, privileges]);
    const columns = await pool.query(`
      SELECT count(*)::int AS count
      FROM pg_catalog.pg_attribute a
      CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES'])
        AS privileges(privilege)
      WHERE a.attrelid = 'public.suppliers'::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND pg_catalog.has_column_privilege(
          $1, 'public.suppliers'::regclass, a.attname, privilege
        )
    `, [roleName]);
    roles.push({
      role: roleName,
      present: true,
      retained_table_privileges: retained.rows.map((row) => row.privilege),
      retained_column_privilege_count: columns.rows[0].count,
    });
  }
  const owner = posture.rows[0].table_owner;
  const ownerPrivileges = tableAcl.rows.map((row) => row.privilege_type).sort();
  const ownerAclMatches =
    owner === "valtriox_test" &&
    columnAcl.rows.length === 0 &&
    tableAcl.rows.length === privileges.length &&
    tableAcl.rows.every(
      (row) =>
        row.grantee === owner &&
        row.grantor === owner &&
        row.is_grantable === false,
    ) &&
    canonicalJson(ownerPrivileges) === canonicalJson([...privileges].sort());
  return {
    constraints: constraints.rows,
    ...posture.rows[0],
    table_acl: tableAcl.rows,
    column_acl: columnAcl.rows,
    owner_acl_matches: ownerAclMatches,
    roles,
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

async function proveExactMigrationFailure(pool, scenario, attempt) {
  const invalidCounts = await captureInvalidSupplierCounts(pool);
  if (
    invalidCounts.invalid_rating_count !== 1 ||
    invalidCounts.invalid_status_count !== 0
  ) {
    fail(`Failure ${attempt} does not have the exact invalid-rating precondition`);
  }

  const securityBefore = await captureSecurity(pool);
  const dataBefore = await captureData(pool);
  const client = await pool.connect();
  let migrationError = null;
  try {
    await client.query(migrationSql);
  } catch (error) {
    migrationError = error;
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
  if (
    !migrationError ||
    migrationError.code !== "23514" ||
    !/invalid rating data exists/i.test(migrationError.message || "")
  ) {
    fail(`Failure ${attempt} did not reproduce the exact SQLSTATE 23514 preflight`);
  }

  const securityAfter = await captureSecurity(pool);
  const dataAfter = await captureData(pool);
  if (canonicalJson(securityBefore) !== canonicalJson(securityAfter)) {
    fail(`Failure ${attempt} exact SQL probe changed Supplier schema/security`);
  }
  if (canonicalJson(dataBefore) !== canonicalJson(dataAfter)) {
    fail(`Failure ${attempt} exact SQL probe changed application data`);
  }

  const proof = {
    evidence_kind: "exact_forward_migration_failure_probe",
    migration_name: FORWARD_MIGRATION,
    migration_checksum: migrationChecksum,
    sqlstate: migrationError.code,
    message: migrationError.message,
    detail: migrationError.detail || null,
    hint: migrationError.hint || null,
    invalid_supplier_counts: invalidCounts,
    transaction_rolled_back: true,
    supplier_state_sha256_before: sha256(canonicalJson(securityBefore)),
    supplier_state_sha256_after: sha256(canonicalJson(securityAfter)),
    application_data_sha256_before: dataBefore.aggregate_sha256,
    application_data_sha256_after: dataAfter.aggregate_sha256,
  };
  writeJson(scenarioPath(scenario, `exact-sql-failure-${attempt}.json`), proof);
  return proof;
}

function assertPostconditions(security, label) {
  if (
    !hasExactCommittedConstraints(security.constraints) ||
    !hasExactDeniedPosture(security)
  ) fail(`${label} constraint/security proof failed`);
}

async function assertData(pool, expected, label) {
  const seed = await pool.query(
    "SELECT rating, status FROM public.suppliers WHERE id = 'supplier-pathb'",
  );
  if (
    seed.rowCount !== 1 || seed.rows[0].rating !== 4 || seed.rows[0].status !== "active"
  ) fail(`${label} did not retain the representative Supplier row`);
  const actual = await captureData(pool);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail(`${label} changed application data fingerprints`);
  }
  return actual;
}

function assertFailedDeploy(result, history, exactSqlProof, label) {
  for (const token of ["P3018", FORWARD_MIGRATION, "23514"]) {
    if (!result.combined.includes(token)) fail(`${label} output is missing ${token}`);
  }
  const unresolved = unresolvedRows(history);
  if (unresolved.length !== 1) fail(`${label} did not create one unresolved row`);
  const row = unresolved[0];
  const logs = String(row.logs || "");
  if (!row.id || row.checksum !== migrationChecksum || !row.started_at ||
      row.applied_steps_count !== 0) {
    fail(`${label} history row is not an exact unresolved migration attempt`);
  }

  if (
    !logs.includes("23514") ||
    !/invalid rating/i.test(logs) ||
    exactSqlProof.sqlstate !== "23514" ||
    !/invalid rating data exists/i.test(exactSqlProof.message)
  ) {
    fail(`${label} does not prove the exact SQLSTATE 23514 invalid-rating failure`);
  }
  return {
    row,
    failureMode: "prisma_p3018_with_history_log",
  };
}

async function createFailure(pool, scenario, attempt) {
  await pool.query("UPDATE public.suppliers SET rating=0 WHERE id='supplier-pathb'");
  const exactSqlProof = await proveExactMigrationFailure(pool, scenario, attempt);
  const result = runFailure(
    npx,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, `failed-deploy-${attempt}-output.txt`),
  );
  const history = await readHistory(pool);
  const { row, failureMode } = assertFailedDeploy(
    result,
    history,
    exactSqlProof,
    `Failed deploy ${attempt}`,
  );
  writeJson(scenarioPath(scenario, `failed-deploy-${attempt}-history.json`), history);
  writeJson(scenarioPath(scenario, `failed-deploy-${attempt}-proof.json`), {
    evidence_kind: "prisma_failed_forward_migration_attempt",
    migration_name: FORWARD_MIGRATION,
    migration_checksum: migrationChecksum,
    prisma_exit_code: result.status,
    prisma_signal: result.signal,
    prisma_spawn_error: result.spawnError,
    failure_mode: failureMode,
    exact_sql_failure_probe: exactSqlProof,
    unresolved_history_row: row,
  });
  await pool.query("UPDATE public.suppliers SET rating=4 WHERE id='supplier-pathb'");
  return { row, history, failureMode };
}

async function verifyFinal(pool, scenario, expectedData, history, details) {
  const security = await captureSecurity(pool);
  assertPostconditions(security, scenario);
  const data = await assertData(pool, expectedData, scenario);
  writeJson(scenarioPath(scenario, "application-data-after.json"), data);
  writeJson(scenarioPath(scenario, "integration-final-proof.json"), {
    scenario,
    migration_name: FORWARD_MIGRATION,
    migration_checksum: migrationChecksum,
    ...details,
    history,
    security,
    application_data_state: data,
  });
}

async function exerciseRolledBack(pool) {
  const scenario = "rolled-back";
  await resetDatabase(pool);
  prepareBaseline();
  const expectedData = await captureData(pool);
  writeJson(scenarioPath(scenario, "application-data-before.json"), expectedData);

  const prestate1 = capturePrestate(scenario, "capture-prestate-1");
  const failed1 = await createFailure(pool, scenario, 1);
  await assertData(pool, expectedData, "Corrected first failure");

  const beforeWrong = await readHistory(pool);
  writeJson(scenarioPath(scenario, "wrong-applied-history-before.json"), beforeWrong);
  const wrong = rejectRecovery(scenario, "wrong-applied", "--applied", prestate1);
  if (!/does not match classified recovery mode --rolled-back/i.test(wrong.combined)) {
    fail("Wrong --applied rejection did not identify --rolled-back mode");
  }
  const afterWrong = await readHistory(pool);
  writeJson(scenarioPath(scenario, "wrong-applied-history-after.json"), afterWrong);
  assertUnchanged(beforeWrong, afterWrong, "Wrong --applied recovery");

  recover(scenario, "resolve-rolled-back-1", "--rolled-back", prestate1);
  const afterRollback1 = await readHistory(pool);
  const rolled1 = forwardRows(afterRollback1).find((row) => row.id === failed1.row.id);
  assertOnlyRolledBack(failed1.row, rolled1, "First --rolled-back recovery");
  writeJson(scenarioPath(scenario, "history-after-rollback-1.json"), afterRollback1);

  // A fresh prestate binds the prior exact rolled-back row before retry two.
  const prestate2 = capturePrestate(scenario, "capture-prestate-2");
  const failed2 = await createFailure(pool, scenario, 2);
  await assertData(pool, expectedData, "Corrected second failure");
  recover(scenario, "resolve-rolled-back-2", "--rolled-back", prestate2);
  const afterRollback2 = await readHistory(pool);
  const oldAfter2 = forwardRows(afterRollback2).find((row) => row.id === failed1.row.id);
  const rolled2 = forwardRows(afterRollback2).find((row) => row.id === failed2.row.id);
  if (canonicalJson(oldAfter2) !== canonicalJson(rolled1)) {
    fail("Second recovery mutated the prior rolled-back row");
  }
  assertOnlyRolledBack(failed2.row, rolled2, "Second --rolled-back recovery");
  writeJson(scenarioPath(scenario, "history-after-rollback-2.json"), afterRollback2);

  runSuccess(
    npx,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "retry-deploy-output.txt"),
  );
  const afterRetry = await readHistory(pool);
  const rows = forwardRows(afterRetry);
  const applied = rows.filter((row) => row.finished_at && row.rolled_back_at === null);
  if (rows.length !== 3 || applied.length !== 1) {
    fail("Retry must leave two rolled-back rows and one applied row");
  }
  assertAppliedRow(applied[0], 1, "Retry applied row");
  if ([failed1.row.id, failed2.row.id].includes(applied[0].id)) {
    fail("Retry applied row ID is not distinct");
  }
  for (const expected of [rolled1, rolled2]) {
    const actual = rows.find((row) => row.id === expected.id);
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      fail("Retry deploy mutated a retained rolled-back row");
    }
  }
  runSuccess(
    npx,
    ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "retry-status-output.txt"),
  );
  runSuccess(
    npx,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "no-op-deploy-output.txt"),
  );
  runSuccess(
    npx,
    ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "post-no-op-status-output.txt"),
  );
  const afterNoOp = await readHistory(pool);
  assertUnchanged(afterRetry, afterNoOp, "Rolled-back no-op deploy");
  await verifyFinal(pool, scenario, expectedData, afterNoOp, {
    retained_failed_row_ids: [failed1.row.id, failed2.row.id],
    failure_modes: [failed1.failureMode, failed2.failureMode],
    applied_row_id: applied[0].id,
  });
}

async function exercisePartialRejected(pool) {
  const scenario = "partial-rejected";
  await resetDatabase(pool);
  prepareBaseline();
  const prestate = capturePrestate(scenario, "capture-prestate");
  const id = crypto.randomUUID();
  await pool.query(`
    INSERT INTO public._prisma_migrations
      (id, checksum, migration_name, logs, started_at, applied_steps_count)
    VALUES ($1, $2, $3, $4, NOW(), 0)
  `, [id, migrationChecksum, FORWARD_MIGRATION, "synthetic partial-state interruption"]);
  await pool.query(`
    ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
  `);
  const before = await readHistory(pool);
  writeJson(scenarioPath(scenario, "history-before.json"), before);
  const rejected = rejectRecovery(
    scenario, "partial-applied-rejection", "--applied", prestate,
  );
  if (!/partial, ambiguous, or unsupported/i.test(rejected.combined)) {
    fail("Partial-state rejection diagnostic missing");
  }
  const after = await readHistory(pool);
  writeJson(scenarioPath(scenario, "history-after.json"), after);
  assertUnchanged(before, after, "Partial-state rejection");
  writeJson(scenarioPath(scenario, "integration-final-proof.json"), {
    scenario,
    rejected_history_row_id: id,
    history_unchanged: true,
    history: after,
  });
}

async function exerciseApplied(pool) {
  const scenario = "applied";
  await resetDatabase(pool);
  prepareBaseline();
  const expectedData = await captureData(pool);
  writeJson(scenarioPath(scenario, "application-data-before.json"), expectedData);
  const prestate = capturePrestate(scenario, "capture-prestate");
  const id = crypto.randomUUID();
  await pool.query(`
    INSERT INTO public._prisma_migrations
      (id, checksum, migration_name, logs, started_at, applied_steps_count)
    VALUES ($1, $2, $3, $4, NOW(), 0)
  `, [id, migrationChecksum, FORWARD_MIGRATION, "synthetic post-COMMIT interruption"]);
  await pool.query(migrationSql);
  const before = await readHistory(pool);
  const unfinished = unresolvedRows(before)[0];
  if (!unfinished || unfinished.id !== id) fail("Applied scenario unfinished row mismatch");
  writeJson(scenarioPath(scenario, "wrong-rolled-back-history-before.json"), before);
  const wrong = rejectRecovery(
    scenario, "wrong-rolled-back", "--rolled-back", prestate,
  );
  if (!/does not match classified recovery mode --applied/i.test(wrong.combined)) {
    fail("Wrong --rolled-back rejection did not identify --applied mode");
  }
  const afterWrong = await readHistory(pool);
  writeJson(scenarioPath(scenario, "wrong-rolled-back-history-after.json"), afterWrong);
  assertUnchanged(before, afterWrong, "Wrong --rolled-back recovery");

  recover(scenario, "resolve-applied", "--applied", prestate);
  const afterResolve = await readHistory(pool);
  const rows = forwardRows(afterResolve);
  const retired = rows.find((row) => row.id === id);
  assertOnlyRolledBack(unfinished, retired, "--applied original row retirement");
  const applied = rows.filter((row) => row.finished_at && row.rolled_back_at === null);
  if (rows.length !== 2 || applied.length !== 1) {
    fail("--applied history cardinality is not exact");
  }
  assertAppliedRow(applied[0], 0, "Resolved-applied row");
  if (applied[0].id === id || applied[0].started_at !== applied[0].finished_at) {
    fail("Resolved-applied ID/timestamp semantics are incorrect");
  }
  runSuccess(
    npx,
    ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "post-resolve-status-output.txt"),
  );
  runSuccess(
    npx,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "no-op-deploy-output.txt"),
  );
  runSuccess(
    npx,
    ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    scenarioPath(scenario, "post-no-op-status-output.txt"),
  );
  const afterNoOp = await readHistory(pool);
  assertUnchanged(afterResolve, afterNoOp, "Applied no-op deploy");
  await verifyFinal(pool, scenario, expectedData, afterNoOp, {
    retired_history_row_id: id,
    applied_row_id: applied[0].id,
  });
}

function collectEvidence(directory, root = directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`Evidence symlink is forbidden: ${absolute}`);
    if (entry.isDirectory()) {
      files.push(...collectEvidence(absolute, root));
    } else if (entry.isFile()) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (relative === "manifest.json") continue;
      const contents = fs.readFileSync(absolute);
      files.push({ path: relative, bytes: contents.length, sha256: sha256(contents) });
    } else {
      fail(`Unsupported evidence entry: ${absolute}`);
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function writeManifest() {
  const files = collectEvidence(integrationRoot);
  if (files.length === 0 || files.some((file) => file.bytes === 0)) {
    fail("Manifest requires a complete set of non-empty evidence files");
  }
  writeJson(path.join(integrationRoot, "manifest.json"), {
    evidence_kind: "synthetic_supplier_recovery_integration",
    production_recovery_proof: false,
    migration_name: FORWARD_MIGRATION,
    migration_checksum: migrationChecksum,
    pr_head_sha: headSha,
    checkout_sha: checkoutSha,
    tested_merge_sha: mergeSha,
    run_id: runId,
    run_attempt: runAttempt,
    generated_at_utc: new Date().toISOString(),
    integration_script_sha256: sha256(fs.readFileSync(__filename)),
    files_sha256: sha256(canonicalJson(files)),
    files,
  });
}

async function main() {
  for (const [label, value] of [
    ["checkout SHA", checkoutSha],
    ["PR head SHA", headSha],
    ["merge SHA", mergeSha],
  ]) {
    if (!/^[0-9a-f]{40}$/.test(value)) fail(`Invalid ${label}`);
  }
  if (fs.existsSync(integrationRoot)) {
    fail(`Integration evidence already exists: ${integrationRoot}`);
  }
  fs.mkdirSync(integrationRoot, { recursive: true });
  const pool = new Pool({
    connectionString,
    ssl: strictSupabaseTls(connectionString, parsed.isLocal),
    connectionTimeoutMillis: 15_000,
  });
  try {
    await assertConnectedIdentity(pool, parsed);
    await exerciseRolledBack(pool);
    await exercisePartialRejected(pool);
    await exerciseApplied(pool);
    writeManifest();
    console.log(
      "Supplier recovery integration passed: exact 23514/Prisma transaction-failure proof, two-attempt rollback/retry, wrong/partial rejection, applied recovery, status/no-op, security, data, and manifest proofs",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
