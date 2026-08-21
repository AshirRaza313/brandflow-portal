"use strict";

const fs = require("fs");
const { Pool } = require("pg");
const { APPROVED_TABLES } = require("./catalog-contract.cjs");
const { assertConnectedIdentity, validateRehearsalUrl } = require("./safety-guard.cjs");
const { strictSupabaseTls } = require("./supabase-tls.cjs");

async function main() {
  const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
  const pool = new Pool({
    connectionString: process.env.REHEARSAL_DATABASE_URL,
    ssl: strictSupabaseTls(process.env.REHEARSAL_DATABASE_URL, parsed.isLocal),
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  try {
    await assertConnectedIdentity(client, parsed);
    await client.query("BEGIN");
    const existingObjects = await client.query(`
      SELECT 'relation' AS object_type, cls.relname AS object_name
      FROM pg_class cls
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relkind IN ('r', 'p', 'v', 'm', 'S', 'f', 'c')
      UNION ALL
      SELECT 'type', typ.typname
      FROM pg_type typ
      JOIN pg_namespace ns ON ns.oid = typ.typnamespace
      WHERE ns.nspname = 'public'
        AND typ.typtype IN ('c', 'd', 'e', 'r', 'm')
        AND typ.typrelid = 0
      UNION ALL
      SELECT 'routine', proc.proname
      FROM pg_proc proc
      JOIN pg_namespace ns ON ns.oid = proc.pronamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'collation', coll.collname
      FROM pg_collation coll
      JOIN pg_namespace ns ON ns.oid = coll.collnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'operator', oper.oprname
      FROM pg_operator oper
      JOIN pg_namespace ns ON ns.oid = oper.oprnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'text_search_config', cfg.cfgname
      FROM pg_ts_config cfg
      JOIN pg_namespace ns ON ns.oid = cfg.cfgnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'text_search_dictionary', dict.dictname
      FROM pg_ts_dict dict
      JOIN pg_namespace ns ON ns.oid = dict.dictnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'text_search_parser', parser.prsname
      FROM pg_ts_parser parser
      JOIN pg_namespace ns ON ns.oid = parser.prsnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'text_search_template', template.tmplname
      FROM pg_ts_template template
      JOIN pg_namespace ns ON ns.oid = template.tmplnamespace
      WHERE ns.nspname = 'public'
      UNION ALL
      SELECT 'extension', ext.extname
      FROM pg_extension ext
      JOIN pg_namespace ns ON ns.oid = ext.extnamespace
      WHERE ns.nspname = 'public'
      ORDER BY object_type, object_name
    `);
    if (existingObjects.rows.length !== 0) {
      const preview = existingObjects.rows
        .slice(0, 10)
        .map((row) => `${row.object_type}:${row.object_name}`)
        .join(", ");
      throw new Error(`Path-B replay requires a clean public schema; found ${preview}`);
    }

    const sql = fs.readFileSync(
      "prisma/migrations/20260101000000_baseline/migration.sql",
      "utf8"
    );
    await client.query(sql);

    const after = await client.query(`
      SELECT cls.relname AS table_name
      FROM pg_class cls
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'p')
      ORDER BY cls.relname
    `);
    const actual = after.rows.map((row) => row.table_name);
    const expected = [...APPROVED_TABLES].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Baseline table set mismatch: expected ${expected.length}, got ${actual.length}`);
    }
    const history = await client.query(
      "SELECT to_regclass('public._prisma_migrations') AS history_table"
    );
    if (history.rows[0].history_table !== null) {
      throw new Error("Path-B precondition failed: _prisma_migrations must not exist after raw replay");
    }
    await client.query("COMMIT");
    console.log(`Raw baseline replay complete: ${actual.length} application tables, no Prisma history`);
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
