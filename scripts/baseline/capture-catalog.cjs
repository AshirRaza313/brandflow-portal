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
const { Pool } = require('pg');
const fs = require('fs');
const connectionString = process.env.REHEARSAL_DATABASE_URL;
if (!connectionString) { console.error('REHEARSAL_DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({ connectionString, ssl: isCiLocalhost ? undefined : { rejectUnauthorized: false } });
(async () => {
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  const roles = await pool.query(`SELECT rolname FROM pg_roles ORDER BY rolname`);
  fs.writeFileSync('backups/catalog-tables.json', JSON.stringify(tables.rows, null, 2));
  fs.writeFileSync('backups/roles.json', JSON.stringify(roles.rows, null, 2));
  console.log('Catalog and roles captured successfully');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
