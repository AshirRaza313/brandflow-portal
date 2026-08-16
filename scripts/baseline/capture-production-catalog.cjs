// scripts/baseline/capture-production-catalog.cjs
// Captures production database catalog for baseline comparison.
// Safety guard: validates PRODUCTION_DATABASE_URL points only to
// the known production project (ref wqwsagnxkamblnefhpzx).
// Rejects rehearsal database, transaction pooler, and unknown hosts.

const fs = require('fs');
const { Pool } = require('pg');
const { validateProductionUrl } = require('./safety-guard.cjs');

var parsed = validateProductionUrl('PRODUCTION_DATABASE_URL');
const connectionString = process.env.PRODUCTION_DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const tables = await pool.query(`
    SELECT table_name,
           (SELECT count(*) FROM information_schema.columns c
            WHERE c.table_schema='public' AND c.table_name=t.table_name) AS column_count
    FROM information_schema.tables t
    WHERE table_schema='public'
    ORDER BY table_name
  `);

  // Constraints: join pg_class for unquoted table names.
  // conrelid::regclass produces quoted names like "User" for mixed-case
  // tables, which breaks catalog lookup keyed by unquoted names.
  const constraints = await pool.query(`
    SELECT
      c.relname AS table_name,
      con.contype,
      con.conname
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY c.relname, con.conname
  `);

  const indexes = await pool.query(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname='public'
    ORDER BY tablename, indexname
  `);

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/production-catalog.json', JSON.stringify({
    capturedAt: new Date().toISOString(),
    tables: tables.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
  }, null, 2));
  console.log('Production catalog captured successfully');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });