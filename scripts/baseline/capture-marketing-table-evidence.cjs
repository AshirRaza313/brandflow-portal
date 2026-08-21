"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const {
  assertConnectedIdentity,
  validateProductionUrl,
  PRODUCTION_REF,
} = require("./safety-guard.cjs");
const {
  canonicalJson,
  repositoryFileSha256,
  sha256,
} = require("./catalog-contract.cjs");

const MARKETING_TABLES = [
  "Subscriber",
  "SubscriberList",
  "SubscriberListMembership",
  "Campaign",
  "EmailCampaign",
  "EmailDelivery",
  "SocialAccount",
  "SocialPost",
  "ScheduledJob",
];

async function main() {
  if (!/^[0-9a-f]{40}$/.test(process.env.EVIDENCE_HEAD_SHA || "")) {
    throw new Error("EVIDENCE_HEAD_SHA must be the exact 40-character trusted-main SHA");
  }
  const parsed = validateProductionUrl("PRODUCTION_DATABASE_URL");
  const outputPath = process.env.MARKETING_EVIDENCE_OUTPUT || "backups/marketing-table-evidence.json";
  const pool = new Pool({
    connectionString: process.env.PRODUCTION_DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const connectedIdentity = await assertConnectedIdentity(client, parsed);
    const identity = await client.query(`
      SELECT current_database() AS db_name, current_user AS db_user, version() AS pg_version
    `);
    const result = await client.query(
      `SELECT requested.name,
              to_regclass(format('public.%I', requested.name)) IS NOT NULL AS present
       FROM unnest($1::text[]) AS requested(name)
       ORDER BY requested.name`,
      [MARKETING_TABLES]
    );
    await client.query("COMMIT");

    const evidence = {
      evidence_kind: "explicit_marketing_table_presence",
      project_ref: PRODUCTION_REF,
      source_host: parsed.host,
      source_port: parsed.port,
      db_name: identity.rows[0].db_name,
      db_user: identity.rows[0].db_user,
      captured_at_utc: new Date().toISOString(),
      pg_version: identity.rows[0].pg_version,
      evidence_head_sha: process.env.EVIDENCE_HEAD_SHA,
      connected_identity: connectedIdentity,
      transaction_mode: "repeatable_read_read_only",
      capture_script_sha256: repositoryFileSha256(__filename),
      safety_guard_sha256: repositoryFileSha256(
        path.resolve(__dirname, "safety-guard.cjs")
      ),
      tables: result.rows,
    };
    evidence.sha256 = sha256(canonicalJson(evidence));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${canonicalJson(evidence)}\n`);
    console.log(`Marketing table evidence captured: ${outputPath}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
