if (!process.env.REHEARSAL_DATABASE_URL) {
  console.error("REHEARSAL_DATABASE_URL not set");
  process.exit(1);
}
const isCiLocalhost =
  process.env.CI === "true" && process.env.REHEARSAL_DATABASE_URL.includes("localhost");
if (!isCiLocalhost && !process.env.REHEARSAL_DATABASE_URL.includes("supabase.co")) {
  console.error("REHEARSAL_DATABASE_URL must point to a Supabase database");
  process.exit(1);
}
if (process.env.REHEARSAL_DATABASE_URL.includes("db.wqwsagnxkamblnefhpzx.supabase.co")) {
  console.error("Production database rejected");
  process.exit(1);
}
const fs = require('fs');
const { Pool } = require('pg');
const connectionString = process.env.REHEARSAL_DATABASE_URL;
if (!connectionString) {
  console.error('REHEARSAL_DATABASE_URL not set');
  process.exit(1);
}
const sql = fs.readFileSync('prisma/migrations/20260101000000_baseline/migration.sql', 'utf8');
const pool = new Pool({ connectionString, ssl: isCiLocalhost ? undefined : { rejectUnauthorized: false } });
(async () => {
  await pool.query(sql);
  const tables = await pool.query(`SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'`);
  console.log('Tables after baseline replay:', tables.rows[0].count);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
