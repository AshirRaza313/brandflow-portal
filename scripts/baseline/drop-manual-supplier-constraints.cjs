const { Pool } = require('pg');
const url = process.env.REHEARSAL_DATABASE_URL;
if (!url) { console.error('REHEARSAL_DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
(async () => {
  await pool.query(`ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_rating_check"`);
  await pool.query(`ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_status_check"`);
  console.log('Dropped manual supplier CHECK constraints from rehearsal DB');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });