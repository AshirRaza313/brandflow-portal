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

const BASELINE_MIGRATION = "20260101000000_baseline";
const FORWARD_MIGRATION = "20260201000000_add_notification_read_receipt";
const EVIDENCE_DIR = path.resolve("backups/path-b-evidence");
const migrationName = process.argv[2];
if (migrationName !== BASELINE_MIGRATION) {
  console.error(`Only ${BASELINE_MIGRATION} may be resolved by this wrapper`);
  process.exit(1);
}

const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
const connectionString = process.env.REHEARSAL_DATABASE_URL;
process.env.DATABASE_URL = connectionString;
process.env.DIRECT_DATABASE_URL = connectionString;

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
    ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    { encoding: "utf8", env: process.env }
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  fs.writeFileSync(path.join(EVIDENCE_DIR, `${label}-migrate-status.txt`), output);
  return { status: result.status, output };
}

function runPrismaDeploy(label) {
  const result = spawnSync(
    npx,
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
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
  const expectedTables = [...APPROVED_TABLES].sort();
  const isAfterForward = label.includes("after-forward");
  if (!isAfterForward) {
    if (JSON.stringify(tables) !== JSON.stringify(expectedTables)) {
      throw new Error(`${label}: application table set does not match approved baseline`);
    }
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
    migration: migrationName,
    table_fingerprints: fingerprints,
    aggregate_sha256: sha256(canonicalJson(fingerprints)),
  };
  writeJson(`${label}-data-state.json`, state);
  return state;
}

function assertDataUnchanged(before, after) {
  if (before.aggregate_sha256 !== after.aggregate_sha256) {
    throw new Error("Application data fingerprint changed during migrate resolve");
  }
}

async function main() {
  fs.rmSync(EVIDENCE_DIR, { recursive: true, force: true });
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const pool = new Pool({
    connectionString,
    ssl: parsed.isLocal ? undefined : { rejectUnauthorized: true },
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
      !/(not yet been applied|not in sync)/i.test(preStatus.output)
    ) {
      throw new Error(
        `Pre-resolve migrate status was not the expected pinned-pending state (exit=${preStatus.status})`
      );
    }

    // Ensure _prisma_migrations table exists before resolve
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public._prisma_migrations (
        id varchar(36) PRIMARY KEY,
        checksum varchar(64) NOT NULL,
        finished_at timestamptz,
        migration_name varchar(255) NOT NULL,
        logs text,
        rolled_back_at timestamptz,
        started_at timestamptz NOT NULL DEFAULT now(),
        applied_steps_count integer NOT NULL DEFAULT 0
      )
    `);

    execFileSync(
      npx,
      [
        "prisma",
        "migrate",
        "resolve",
        "--schema",
        "prisma/schema.prisma",
        "--applied",
        BASELINE_MIGRATION,
      ],
      { stdio: "inherit", env: process.env }
    );

    const postHistory = await pool.query(
      `SELECT migration_name, finished_at FROM public._prisma_migrations WHERE migration_name = $1`,
      [BASELINE_MIGRATION]
    );
    if (postHistory.rows.length !== 1 || !postHistory.rows[0].finished_at) {
      throw new Error("Post-resolve baseline migration history is missing or not finished");
    }

    // Now deploy forward migration to prove evolved schema can be adopted on populated DB
    const forwardDeploy = runPrismaDeploy("forward-migrate");
    if (forwardDeploy.status !== 0) {
      throw new Error("Forward migration deploy failed");
    }

    const afterForwardData = await captureDataState(pool, "after-forward-migrate");
    const afterForwardCatalogPath = path.join(EVIDENCE_DIR, "after-forward-migrate-catalog.json");
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

    const afterData = await captureDataState(pool, "after-resolve");
    assertDataUnchanged(beforeData, afterData);
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

    const history = await pool.query(`
      SELECT
        migration_name,
        checksum,
        started_at,
        finished_at,
        rolled_back_at,
        applied_steps_count
      FROM public._prisma_migrations
      ORDER BY started_at
    `);
    if (history.rows.length !== 2) {
      throw new Error(`Expected two migration history rows (baseline + forward), got ${history.rows.length}`);
    }
    const baselineRow = history.rows.find((r) => r.migration_name === BASELINE_MIGRATION);
    const forwardRow = history.rows.find((r) => r.migration_name === FORWARD_MIGRATION);
    if (!baselineRow || !forwardRow) {
      throw new Error("Missing expected migration history rows");
    }
    const expectedBaselineChecksum = sha256(
      fs.readFileSync(`prisma/migrations/${BASELINE_MIGRATION}/migration.sql`)
    );
    if (baselineRow.checksum !== expectedBaselineChecksum) {
      throw new Error("Baseline migration history checksum mismatch");
    }
    const historyEvidence = {
      exact_history_row_count: history.rows.length,
      migration_name: baselineRow.migration_name,
      checksum: baselineRow.checksum,
      started_at: baselineRow.started_at,
      finished_at: baselineRow.finished_at,
      rolled_back_at: baselineRow.rolled_back_at,
      applied_steps_count: baselineRow.applied_steps_count,
      pr_head_sha: headSha,
      tested_merge_sha: mergeSha,
      run_id: runId,
      run_attempt: runAttempt,
    };
    writeJson("migration-history.json", historyEvidence);

    const evidenceFiles = fs
      .readdirSync(EVIDENCE_DIR)
      .filter((filename) => filename !== "manifest.json")
      .sort();
    const manifest = {
      evidence_kind: "synthetic_path_b_adoption",
      production_recovery_proof: false,
      migration_name: BASELINE_MIGRATION,
      pr_head_sha: headSha,
      tested_merge_sha: mergeSha,
      run_id: runId,
      run_attempt: runAttempt,
      generated_at_utc: new Date().toISOString(),
      before_data_sha256: beforeData.aggregate_sha256,
      after_data_sha256: afterData.aggregate_sha256,
      before_schema_sha256: structuralSha256(beforeCatalog),
      after_schema_sha256: structuralSha256(afterCatalog),
      files: Object.fromEntries(
        evidenceFiles.map((filename) => [
          filename,
          sha256(fs.readFileSync(path.join(EVIDENCE_DIR, filename))),
        ])
      ),
    };
    writeJson("manifest.json", manifest);
    console.log("Synthetic Path-B adoption proof complete; baseline plus forward migration proved");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
