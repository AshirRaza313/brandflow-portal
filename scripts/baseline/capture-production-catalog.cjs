// scripts/baseline/capture-production-catalog.cjs
// Captures production database catalog for baseline comparison.
// Safety guard: validates PRODUCTION_DATABASE_URL points only to
// the known production project (ref wqwsagnxkamblnefhpzx).
// Rejects rehearsal database, transaction pooler, and unknown hosts.
// Output format: nested per-table (matches capture-full-catalog.cjs).

const fs = require('fs');
const { Pool } = require('pg');
const { validateProductionUrl } = require('./safety-guard.cjs');

var parsed = validateProductionUrl('PRODUCTION_DATABASE_URL');
const connectionString = process.env.PRODUCTION_DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function capture() {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'
    ORDER BY table_name
  `);

  const catalog = {};
  for (const t of tables.rows) {
    const name = t.table_name;
    const columns = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name,
        is_identity,
        is_generated,
        collation_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [name]);
    catalog[name] = {
      columns: columns.rows,
      constraints: [],
      indexes: [],
    };
  }

  // Constraints: join pg_class for unquoted table names.
  // conrelid::regclass produces quoted names like "User" for mixed-case
  // tables, which breaks catalog lookup keyed by unquoted names.
  const constraints = await pool.query(`
    SELECT
      c.relname AS table_name,
      con.conname,
      con.contype,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY c.relname, con.conname
  `);
  for (const c of constraints.rows) {
    if (catalog[c.table_name]) {
      catalog[c.table_name].constraints.push({
        name: c.conname,
        type: c.contype,
        definition: c.definition,
      });
    }
  }

  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  for (const i of indexes.rows) {
    if (catalog[i.tablename]) {
      catalog[i.tablename].indexes.push({
        name: i.indexname,
        definition: i.indexdef,
      });
    }
  }

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/production-catalog.json', JSON.stringify(catalog, null, 2));
  console.log('Production catalog captured to backups/production-catalog.json', 'tables:', Object.keys(catalog).length);
  await pool.end();
}

capture().catch((e) => { console.error(e); process.exit(1); });