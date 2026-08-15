if (!process.env.REHEARSAL_DATABASE_URL) {
  console.error("REHEARSAL_DATABASE_URL not set");
  process.exit(1);
}
if (!process.env.REHEARSAL_DATABASE_URL.includes("supabase.co")) {
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
if (!connectionString) { console.error('REHEARSAL_DATABASE_URL not set'); process.exit(1); }
const sql = fs.readFileSync('scripts/baseline/revoke-supplier-grants.sql', 'utf8');
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
(async () => {
  await pool.query(sql);
  console.log('Supplier grants revoked from anon and authenticated');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
