const fs = require('fs');
const { Pool } = require('pg');
const connectionString = process.env.PRODUCTION_DATABASE_URL;
if (!connectionString) {
  console.error('PRODUCTION_DATABASE_URL not set');
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
(async () => {
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  const counts = [];
  for (const t of tables.rows) {
    const name = t.table_name;
    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM "public"."${name}"`);
    counts.push({ table: name, rows: countResult.rows[0].count });
  }
  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/table-row-counts.json', JSON.stringify({ capturedAt: new Date().toISOString(), counts }, null, 2));
  console.log('Table row counts captured successfully');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });