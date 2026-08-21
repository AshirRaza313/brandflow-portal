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
  sha256,
  structuralSha256,
} = require("./catalog-contract.cjs");
const { assertConnectedIdentity, validateRehearsalUrl } = require("./safety-guard.cjs");
const {
  strictPrismaConnectionUrl,
  strictSupabaseTls,
} = require("./supabase-tls.cjs");

const BASELINE_MIGRATION = "20260101000000_baseline";
const FORWARD_MIGRATION = "20260815_add_supplier_constraints_and_security";
const APPROVED_MIGRATION_TRAIN = Object.freeze([
  BASELINE_MIGRATION,
  FORWARD_MIGRATION,
]);
const EVIDENCE_DIR = path.resolve("backups/path-b-evidence");
const migrationName = process.argv[2];
if (migrationName !== BASELINE_MIGRATION) {
  console.error(`Only ${BASELINE_MIGRATION} may be resolved by this wrapper`);
  process.exit(1);
}

const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
const connectionString = process.env.REHEARSAL_DATABASE_URL;
const prismaConnectionString = strictPrismaConnectionUrl(
  connectionString,
  parsed.isLocal,
);
process.env.DATABASE_URL = prismaConnectionString;
process.env.DIRECT_DATABASE_URL = prismaConnectionString;

const prismaSchema = path.resolve("prisma/schema.prisma");
if (!fs.existsSync(prismaSchema)) {
  console.error(`Prisma schema does not exist: ${prismaSchema}`);
  process.exit(1);
}

const migrationRoot = path.resolve("prisma/migrations");
const repositoryMigrations = fs
  .readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (
  JSON.stringify(repositoryMigrations) !==
  JSON.stringify([...APPROVED_MIGRATION_TRAIN].sort())
) {
  console.error(
    `Repository migration train must be exactly ${APPROVED_MIGRATION_TRAIN.join(", ")}`,
  );
  process.exit(1);
}
for (const migration of APPROVED_MIGRATION_TRAIN) {
  const migrationFile = path.join(migrationRoot, migration, "migration.sql");
  if (!fs.existsSync(migrationFile) || !fs.statSync(migrationFile).isFile()) {
    console.error(`Migration SQL does not exist: ${migrationFile}`);
    process.exit(1);
  }
}

const headSha = process.env.PR_HEAD_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const mergeSha = process.env.MERGE_SHA || headSha;
const runId = process.env.GITHUB_RUN_ID || "local";
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "local";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function writeJson(filename, value) {
  const filePath = path.join(EVIDENCE_DIR, filename);
  fs.writeFileSync(filePath, `${canonicalJson(value)}\n`);
  return filePath;
}

function runPrismaStatus(label) {
  const result = spawnSync(
    npx,
    ["prisma", "migrate", "status", "--schema", prismaSchema],
    { encoding: "utf8", env: process.env }
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, `${label}-migrate-status.txt`), output);
  return { status: result.status, output };
}

function runPrismaDeploy(label) {
  const result = spawnSync(
    npx,
    ["prisma", "migrate", "deploy", "--schema", prismaSchema],
    { encoding: "utf8", env: process.env }
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, `${label}-migrate-deploy.txt`), output);
  return { status: result.status, output };
}

async function captureDataState(pool, label) {
  const tableResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `);
  const tables = tableResult.rows.map((row) => row.table_name);
  if (JSON.stringify(tables) !== JSON.stringify([...APPROVED_TABLES].sort())) {
    throw new Error(`${label}: application table set does not match approved baseline`);
  }

  const fingerprints = [];
  for (const table of tables) {
    const rows = await pool.query(
      `SELECT to_jsonb(t)::text AS row_json FROM public.${quoteIdentifier(table)} t`
    );
    const canonicalRows = rows.rows.map((row) => row.row_json).sort();
    fingerprints.push({
      table,
      rows: canonicalRows.length,
      sha256: sha256(canonicalRows.join("\n")),
    });
  }
  const state = {
    label,
    captured_at_utc: new Date().toISOString(),
    target: `${parsed.host}:${parsed.port}/${parsed.dbname}`,
    migration_names: APPROVED_MIGRATION_TRAIN,
    table_fingerprints: fingerprints,
    aggregate_sha256: sha256(canonicalJson(fingerprints)),
  };
  writeJson(`${label}-data-state.json`, state);
  return state;
}

function assertDataUnchanged(before, after, operation) {
  if (before.aggregate_sha256 !== after.aggregate_sha256) {
    throw new Error(`Application data fingerprint changed during ${operation}`);
  }
}

function migrationChecksum(migrationName) {
  return sha256(
    fs.readFileSync(
      path.join(migrationRoot, migrationName, "migration.sql"),
    ),
  );
}

async function captureAndVerifyMigrationHistory(pool, expectedMigrations, filename) {
  const result = await pool.query(`
    SELECT
      migration_name,
      checksum,
      started_at,
      finished_at,
      rolled_back_at,
      applied_steps_count
    FROM public._prisma_migrations
    ORDER BY migration_name
  `);
  const expectedNames = [...expectedMigrations].sort();
  const actualNames = result.rows.map((row) => row.migration_name);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Migration history mismatch: expected ${expectedNames.join(", ")}, got ${actualNames.join(", ")}`,
    );
  }

  for (const row of result.rows) {
    if (row.checksum !== migrationChecksum(row.migration_name)) {
      throw new Error(`Migration history checksum mismatch: ${row.migration_name}`);
    }
    const expectedSteps = row.migration_name === BASELINE_MIGRATION ? 0 : 1;
    if (
      !row.started_at ||
      !row.finished_at ||
      row.rolled_back_at !== null ||
      row.applied_steps_count !== expectedSteps
    ) {
      throw new Error(`Migration history row is not clean: ${row.migration_name}`);
    }
  }

  const evidence = {
    exact_history_row_count: result.rows.length,
    migrations: result.rows,
    pr_head_sha: headSha,
    tested_merge_sha: mergeSha,
    run_id: runId,
    run_attempt: runAttempt,
  };
  writeJson(filename, evidence);
  return evidence;
}

async function assertSupplierConstraintRejects(
  pool,
  { id, status, rating, expectedConstraint },
) {
  const client = await pool.connect();
  let rejected = false;
  try {
    await client.query("BEGIN");
    try {
      await client.query(
        `
          INSERT INTO public.suppliers
            (id, organization_id, name, status, rating, created_at, updated_at)
          VALUES ($1, 'org-pathb', 'Constraint Probe', $2, $3, NOW(), NOW())
        `,
        [id, status, rating],
      );
    } catch (error) {
      rejected = error.code === "23514" && error.constraint === expectedConstraint;
      if (!rejected) throw error;
    }
    if (!rejected) {
      throw new Error(`Supplier constraint probe unexpectedly succeeded: ${expectedConstraint}`);
    }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
  return { constraint: expectedConstraint, rejected_with_sqlstate: "23514" };
}

async function captureSupplierPrivilegePrestate(pool) {
  const roles = [];
  for (const roleName of ["anon", "authenticated", "service_role"]) {
    const result = await pool.query(
      `
        SELECT
          role.rolname AS role,
          pg_catalog.has_table_privilege(
            role.rolname,
            'public.suppliers'::regclass,
            'SELECT'
          ) AS has_table_select,
          pg_catalog.has_column_privilege(
            role.rolname,
            'public.suppliers'::regclass,
            'rating',
            'UPDATE'
          ) AS has_rating_update
        FROM pg_catalog.pg_roles AS role
        WHERE role.rolname = $1
      `,
      [roleName],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Required Supplier denial role is absent before forward deploy: ${roleName}`);
    }
    const state = result.rows[0];
    if (parsed.isLocal && (!state.has_table_select || !state.has_rating_update)) {
      throw new Error(`CI Supplier privilege prestate was not seeded for ${roleName}`);
    }
    roles.push(state);
  }
  const evidence = {
    evidence_kind: "supplier_privilege_prestate",
    ci_requires_seeded_grants: parsed.isLocal,
    roles,
  };
  writeJson("supplier-privileges-before-forward.json", evidence);
  return evidence;
}

async function captureAndVerifySupplierForwardSecurity(pool) {
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
  if (
    constraints.rows.length !== 2 ||
    constraints.rows.some(
      (constraint) => constraint.type !== "c" || constraint.validated !== true,
    )
  ) {
    throw new Error("Supplier forward constraints are missing or not validated");
  }
  const negativeProbes = [
    await assertSupplierConstraintRejects(pool, {
      id: "supplier-invalid-rating-probe",
      status: "active",
      rating: 0,
      expectedConstraint: "suppliers_rating_check",
    }),
    await assertSupplierConstraintRejects(pool, {
      id: "supplier-invalid-status-probe",
      status: "unsupported",
      rating: 4,
      expectedConstraint: "suppliers_status_check",
    }),
  ];

  const posture = await pool.query(`
    SELECT
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
  const security = posture.rows[0];
  if (
    !security ||
    security.rls_enabled ||
    security.rls_forced ||
    security.policy_count !== 0 ||
    security.public_table_grant_count !== 0 ||
    security.public_column_grant_count !== 0
  ) {
    throw new Error("Supplier RLS/PUBLIC privilege posture does not match the approved forward migration");
  }

  const rolePrivileges = [];
  const versionResult = await pool.query(
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
  if (versionResult.rows[0].server_version_num >= 170000) {
    tablePrivileges.push("MAINTAIN");
  }
  for (const roleName of ["anon", "authenticated", "service_role"]) {
    const role = await pool.query(
      "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
      [roleName],
    );
    if (role.rowCount === 0) {
      throw new Error(`Required Supplier denial role is absent: ${roleName}`);
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
    if (retained.rowCount !== 0 || retainedColumns.rows[0].retained_count !== 0) {
      throw new Error(`Supplier role ${roleName} retains an effective privilege`);
    }
    rolePrivileges.push({
      role: roleName,
      present: true,
      retained_table_privileges: [],
      retained_column_privilege_count: 0,
    });
  }

  const evidence = {
    constraints: constraints.rows,
    negative_probes: negativeProbes,
    rls_enabled: security.rls_enabled,
    rls_forced: security.rls_forced,
    policy_count: security.policy_count,
    public_table_grant_count: security.public_table_grant_count,
    public_column_grant_count: security.public_column_grant_count,
    role_privileges: rolePrivileges,
  };
  writeJson("supplier-forward-security.json", evidence);
  return evidence;
}

async function main() {
  fs.rmSync(EVIDENCE_DIR, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const pool = new Pool({
    connectionString,
    ssl: strictSupabaseTls(connectionString, parsed.isLocal),
    connectionTimeoutMillis: 15_000,
  });
  try {
    const connectedIdentity = await assertConnectedIdentity(pool, parsed);
    writeJson("target-identity.json", {
      ...connectedIdentity,
      evidence_kind: "validated_rehearsal_target",
      pr_head_sha: headSha,
      run_id: runId,
    });

    const historyBefore = await pool.query(
      "SELECT to_regclass('public._prisma_migrations') AS history_table"
    );
    if (historyBefore.rows[0].history_table !== null) {
      throw new Error("Path-B precondition failed: _prisma_migrations already exists");
    }

    const seedProof = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public."Organization") AS organizations,
        (SELECT COUNT(*)::int FROM public."User") AS users,
        (SELECT COUNT(*)::int FROM public."OrganizationMember") AS members,
        (SELECT COUNT(*)::int FROM public.suppliers) AS suppliers
    `);
    if (Object.values(seedProof.rows[0]).some((count) => count < 1)) {
      throw new Error("Path-B requires representative populated data before resolve");
    }
    await captureSupplierPrivilegePrestate(pool);

    const beforeData = await captureDataState(pool, "before-resolve");
    const beforeCatalogPath = path.join(EVIDENCE_DIR, "before-resolve-catalog.json");
    const beforeCatalog = await captureFullCatalog({
      connectionString,
      outputPath: beforeCatalogPath,
      projectRef: parsed.projectRef,
      headSha,
      mergeSha,
      runId,
      runAttempt,
      expectedConnectedRole: parsed.expectedConnectedRole,
    });
    const approvedFixture = JSON.parse(
      fs.readFileSync("tests/fixtures/expected-baseline-catalog.json", "utf8")
    );
    const preconditionDiffs = compareCatalogs(approvedFixture, beforeCatalog, {
      production: { sourceKind: "versioned_baseline_fixture" },
      rehearsal: {
        sourceKind: "database_capture",
        projectRef: parsed.projectRef,
        headSha,
        captureProfile: "generic",
      },
    });
    writeReport(
      path.join(EVIDENCE_DIR, "before-resolve-catalog-precondition.txt"),
      preconditionDiffs
    );
    if (preconditionDiffs.length > 0) {
      throw new Error(
        `Path-B schema precondition failed with ${preconditionDiffs.length} catalog difference(s)`
      );
    }

    const preStatus = runPrismaStatus("before-resolve");
    if (
      preStatus.status !== 1 ||
      !preStatus.output.includes(BASELINE_MIGRATION) ||
      !preStatus.output.includes(FORWARD_MIGRATION) ||
      !/(not yet been applied|not in sync)/i.test(preStatus.output)
    ) {
      throw new Error(
        `Pre-resolve migrate status was not the expected pinned-pending state (exit=${preStatus.status})`
      );
    }

    execFileSync(
      npx,
      [
        "prisma",
        "migrate",
        "resolve",
        "--schema",
        prismaSchema,
        "--applied",
        BASELINE_MIGRATION,
      ],
      { stdio: "inherit", env: process.env }
    );

    const forwardPendingStatus = runPrismaStatus("before-forward");
    if (
      forwardPendingStatus.status !== 1 ||
      !forwardPendingStatus.output.includes(FORWARD_MIGRATION) ||
      !/(not yet been applied|not in sync)/i.test(forwardPendingStatus.output)
    ) {
      throw new Error(
        `Post-adoption status was not the exact forward-pending state (exit=${forwardPendingStatus.status})`,
      );
    }

    const afterData = await captureDataState(pool, "after-resolve");
    assertDataUnchanged(beforeData, afterData, "baseline history adoption");
    const afterCatalogPath = path.join(EVIDENCE_DIR, "after-resolve-catalog.json");
    const afterCatalog = await captureFullCatalog({
      connectionString,
      outputPath: afterCatalogPath,
      projectRef: parsed.projectRef,
      headSha,
      mergeSha,
      runId,
      runAttempt,
      expectedConnectedRole: parsed.expectedConnectedRole,
    });
    if (structuralSha256(beforeCatalog) !== structuralSha256(afterCatalog)) {
      throw new Error("Application schema fingerprint changed during migrate resolve");
    }

    await captureAndVerifyMigrationHistory(
      pool,
      [BASELINE_MIGRATION],
      "baseline-adoption-history.json",
    );

    const beforeForwardData = await captureDataState(pool, "before-forward");
    const forwardDeploy = runPrismaDeploy("forward-migration");
    if (forwardDeploy.status !== 0) {
      throw new Error("Guarded Supplier forward prisma migrate deploy failed");
    }
    const afterForwardStatus = runPrismaStatus("after-forward");
    if (afterForwardStatus.status !== 0) {
      throw new Error("Repository migration status is not clean after the Supplier forward deploy");
    }

    const afterForwardData = await captureDataState(pool, "after-forward");
    assertDataUnchanged(
      beforeForwardData,
      afterForwardData,
      "Supplier forward migration",
    );
    const afterForwardCatalogPath = path.join(
      EVIDENCE_DIR,
      "after-forward-catalog.json",
    );
    const afterForwardCatalog = await captureFullCatalog({
      connectionString,
      outputPath: afterForwardCatalogPath,
      projectRef: parsed.projectRef,
      headSha,
      mergeSha,
      runId,
      runAttempt,
      expectedConnectedRole: parsed.expectedConnectedRole,
    });
    const forwardDiffs = compareCatalogs(approvedFixture, afterForwardCatalog, {
      production: { sourceKind: "versioned_baseline_fixture" },
      rehearsal: {
        sourceKind: "database_capture",
        projectRef: parsed.projectRef,
        headSha,
        captureProfile: "generic",
      },
    });
    writeReport(
      path.join(EVIDENCE_DIR, "after-forward-catalog-delta.txt"),
      forwardDiffs,
    );
    const expectedForwardDiffs = [
      "CONSTRAINT_MISSING_IN_PRODUCTION: suppliers.suppliers_rating_check",
      "CONSTRAINT_MISSING_IN_PRODUCTION: suppliers.suppliers_status_check",
    ];
    if (
      JSON.stringify([...forwardDiffs].sort()) !==
      JSON.stringify(expectedForwardDiffs)
    ) {
      throw new Error(
        `Supplier forward catalog delta is not exact: ${forwardDiffs.join("; ")}`,
      );
    }

    const supplierSecurity = await captureAndVerifySupplierForwardSecurity(pool);
    const noOpDeploy = runPrismaDeploy("no-op-after-forward");
    if (noOpDeploy.status !== 0) {
      throw new Error("Second repository migrate deploy did not complete as a no-op");
    }
    const finalStatus = runPrismaStatus("final-after-no-op-forward");
    if (finalStatus.status !== 0) {
      throw new Error("Final repository migration status is not clean");
    }
    await captureAndVerifyMigrationHistory(
      pool,
      APPROVED_MIGRATION_TRAIN,
      "migration-history.json",
    );

    const evidenceFiles = fs
      .readdirSync(EVIDENCE_DIR)
      .filter((filename) => filename !== "manifest.json")
      .sort();
    const manifest = {
      evidence_kind: "synthetic_path_b_adoption_and_forward_train",
      production_recovery_proof: false,
      migration_names: APPROVED_MIGRATION_TRAIN,
      prisma_schema_mode: "repository_history",
      pr_head_sha: headSha,
      tested_merge_sha: mergeSha,
      run_id: runId,
      run_attempt: runAttempt,
      generated_at_utc: new Date().toISOString(),
      before_data_sha256: beforeData.aggregate_sha256,
      after_resolve_data_sha256: afterData.aggregate_sha256,
      before_forward_data_sha256: beforeForwardData.aggregate_sha256,
      after_forward_data_sha256: afterForwardData.aggregate_sha256,
      before_schema_sha256: structuralSha256(beforeCatalog),
      after_resolve_schema_sha256: structuralSha256(afterCatalog),
      after_forward_schema_sha256: structuralSha256(afterForwardCatalog),
      supplier_security_sha256: sha256(canonicalJson(supplierSecurity)),
      files: Object.fromEntries(
        evidenceFiles.map((filename) => [
          filename,
          sha256(fs.readFileSync(path.join(EVIDENCE_DIR, filename))),
        ])
      ),
    };
    writeJson("manifest.json", manifest);
    console.log(
      "Synthetic Path-B baseline adoption and populated Supplier forward train proof complete",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
