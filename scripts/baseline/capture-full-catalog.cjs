"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { Pool } = require("pg");
const { canonicalJson, sha256, structuralSha256 } = require("./catalog-contract.cjs");
const { assertConnectedIdentity } = require("./safety-guard.cjs");

function parseConnectionUrl(connectionString) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch (error) {
    throw new Error(`Invalid PostgreSQL connection URL: ${error.message}`);
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Connection URL must use postgres:// or postgresql://");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const port = Number(parsed.port || 5432);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const user = decodeURIComponent(parsed.username);
  if (!host || !Number.isInteger(port) || !dbName || !user) {
    throw new Error("Connection URL must include host, port, database, and user");
  }
  return {
    host,
    port,
    dbName,
    user,
    isLocal: host === "localhost" || host === "127.0.0.1" || host === "::1",
  };
}

function currentHeadSha(explicitHeadSha) {
  if (explicitHeadSha) return explicitHeadSha;
  if (process.env.PR_HEAD_SHA) return process.env.PR_HEAD_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("PR_HEAD_SHA is required when Git HEAD cannot be resolved");
  }
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function assertAttachedCounts(catalog, rowsByKind) {
  const attached = { columns: 0, constraints: 0, indexes: 0 };
  for (const table of Object.keys(catalog)) {
    attached.columns += catalog[table].columns.length;
    attached.constraints += catalog[table].constraints.length;
    attached.indexes += catalog[table].indexes.length;
  }
  for (const kind of Object.keys(attached)) {
    if (attached[kind] !== rowsByKind[kind].length) {
      throw new Error(
        `${kind} attachment mismatch: queried ${rowsByKind[kind].length}, attached ${attached[kind]}`
      );
    }
  }
}

async function captureFullCatalog(options) {
  const {
    connectionString,
    outputPath,
    projectRef,
    headSha,
    mergeSha = process.env.MERGE_SHA || process.env.GITHUB_SHA || null,
    runId = process.env.GITHUB_RUN_ID || "local",
    runAttempt = process.env.GITHUB_RUN_ATTEMPT || "local",
    extraScriptPaths = [],
    expectedConnectedRole,
  } = options;
  if (!connectionString) throw new Error("connectionString is required");
  if (!outputPath) throw new Error("outputPath is required");
  if (!projectRef) throw new Error("projectRef is required");

  const target = parseConnectionUrl(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: target.isLocal ? undefined : { rejectUnauthorized: true },
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    transactionOpen = true;

    const columns = await client.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.ordinal_position,
        c.data_type,
        format_type(a.atttypid, a.atttypmod) AS formatted_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.datetime_precision,
        c.udt_schema,
        c.udt_name,
        c.domain_schema,
        c.domain_name,
        c.is_identity,
        c.identity_generation,
        c.is_generated,
        c.generation_expression,
        c.collation_name
      FROM information_schema.columns c
      JOIN pg_namespace ns ON ns.nspname = c.table_schema
      JOIN pg_class cls
        ON cls.relnamespace = ns.oid
       AND cls.relname = c.table_name
       AND cls.relkind IN ('r', 'p')
      JOIN pg_attribute a
        ON a.attrelid = cls.oid
       AND a.attname = c.column_name
       AND a.attnum > 0
       AND NOT a.attisdropped
      WHERE c.table_schema = 'public'
        AND c.table_name <> '_prisma_migrations'
      ORDER BY c.table_name, c.ordinal_position
    `);
    const constraints = await client.query(`
      SELECT
        cls.relname AS table_name,
        con.conname AS name,
        con.contype AS type,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relkind IN ('r', 'p')
        AND cls.relname <> '_prisma_migrations'
      ORDER BY cls.relname, con.conname
    `);
    const indexes = await client.query(`
      SELECT idx.tablename AS table_name, idx.indexname AS name, idx.indexdef AS definition
      FROM pg_indexes idx
      JOIN pg_namespace ns ON ns.nspname = idx.schemaname
      JOIN pg_class cls
        ON cls.relnamespace = ns.oid
       AND cls.relname = idx.tablename
       AND cls.relkind IN ('r', 'p')
      WHERE idx.schemaname = 'public'
        AND idx.tablename <> '_prisma_migrations'
      ORDER BY idx.tablename, idx.indexname
    `);
    const tables = await client.query(`
      SELECT cls.relname AS table_name
      FROM pg_class cls
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relkind IN ('r', 'p')
        AND cls.relname <> '_prisma_migrations'
      ORDER BY cls.relname
    `);
    const identity = await client.query(`
      SELECT
        current_database() AS db_name,
        current_user AS db_user,
        session_user AS session_user,
        COALESCE(inet_server_addr()::text, 'local') AS server_address,
        inet_server_port() AS server_port,
        version() AS pg_version,
        current_setting('transaction_read_only') AS transaction_read_only,
        current_setting('transaction_isolation') AS transaction_isolation,
        txid_current_snapshot()::text AS snapshot_id
    `);

    const catalog = {};
    for (const row of tables.rows) {
      catalog[row.table_name] = { columns: [], constraints: [], indexes: [] };
    }
    for (const row of columns.rows) {
      if (!catalog[row.table_name]) throw new Error(`Column attached to unknown table: ${row.table_name}`);
      catalog[row.table_name].columns.push({
        column_name: row.column_name,
        ordinal_position: row.ordinal_position,
        data_type: row.data_type,
        formatted_type: row.formatted_type,
        is_nullable: row.is_nullable,
        column_default: row.column_default,
        character_maximum_length: row.character_maximum_length,
        numeric_precision: row.numeric_precision,
        numeric_scale: row.numeric_scale,
        datetime_precision: row.datetime_precision,
        udt_schema: row.udt_schema,
        udt_name: row.udt_name,
        domain_schema: row.domain_schema,
        domain_name: row.domain_name,
        is_identity: row.is_identity,
        identity_generation: row.identity_generation,
        is_generated: row.is_generated,
        generation_expression: row.generation_expression,
        collation_name: row.collation_name,
      });
    }
    for (const row of constraints.rows) {
      if (!catalog[row.table_name]) throw new Error(`Constraint attached to unknown table: ${row.table_name}`);
      catalog[row.table_name].constraints.push({ name: row.name, type: row.type, definition: row.definition });
    }
    for (const row of indexes.rows) {
      if (!catalog[row.table_name]) throw new Error(`Index attached to unknown table: ${row.table_name}`);
      catalog[row.table_name].indexes.push({ name: row.name, definition: row.definition });
    }
    assertAttachedCounts(catalog, {
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
    });

    const db = identity.rows[0];
    const connectedIdentity = await assertConnectedIdentity(client, {
      host: target.host,
      port: target.port,
      dbname: target.dbName,
      user: target.user,
      projectRef,
      expectedConnectedRole: expectedConnectedRole || target.user,
    });
    const scriptHashes = { capture_engine: fileSha256(__filename) };
    for (const scriptPath of extraScriptPaths) {
      scriptHashes[path.basename(scriptPath)] = fileSha256(scriptPath);
    }
    catalog._provenance = {
      source_kind: "database_capture",
      project_ref: projectRef,
      db_name: db.db_name,
      db_user: db.db_user,
      session_user: db.session_user,
      client_user: target.user,
      source_host: target.host,
      source_port: target.port,
      server_address: db.server_address,
      captured_at_utc: new Date().toISOString(),
      pg_version: db.pg_version,
      head_sha: currentHeadSha(headSha),
      merge_sha: mergeSha,
      run_id: runId,
      run_attempt: runAttempt,
      capture_engine_sha256: scriptHashes.capture_engine,
      supporting_script_sha256: scriptHashes,
      catalog_sha256: structuralSha256(catalog),
      transaction_mode: "repeatable_read_read_only",
      transaction_read_only: db.transaction_read_only,
      transaction_isolation: db.transaction_isolation,
      snapshot_id: db.snapshot_id,
      connected_identity: connectedIdentity,
    };

    await client.query("COMMIT");
    transactionOpen = false;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const tempPath = `${outputPath}.tmp`;
    fs.writeFileSync(tempPath, `${canonicalJson(catalog)}\n`);
    fs.renameSync(tempPath, outputPath);
    console.log(`Catalog captured: ${outputPath} (${tables.rows.length} application tables)`);
    return catalog;
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function cli() {
  const connectionString = process.env.CATALOG_DB_URL || process.argv[2];
  const outputPath = process.env.CATALOG_OUTPUT || process.argv[3] || "backups/rehearsal-full-catalog.json";
  const parsed = connectionString ? parseConnectionUrl(connectionString) : null;
  const projectRef = process.env.CATALOG_PROJECT_REF || (parsed && parsed.isLocal ? "ci-localhost" : null);
  await captureFullCatalog({ connectionString, outputPath, projectRef, headSha: process.env.PR_HEAD_SHA });
}

if (require.main === module) {
  cli().catch((error) => {
    console.error(`Catalog capture failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { captureFullCatalog, parseConnectionUrl };
