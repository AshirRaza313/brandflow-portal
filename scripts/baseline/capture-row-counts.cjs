// scripts/baseline/capture-row-counts.cjs
// Captures row counts for all public tables from production database.
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
  ssl: parsed.isLocal ? undefined : { rejectUnauthorized: false },
});

(async () => {
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
  );
  const counts = [];
  for (const t of tables.rows) {
    const name = t.table_name;
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM "public"."${name}"`
    );
    counts.push({ table: name, rows: countResult.rows[0].count });
  }
  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/table-row-counts.json', JSON.stringify({
    capturedAt: new Date().toISOString(),
    counts
  }, null, 2));
  console.log('Table row counts captured successfully');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });