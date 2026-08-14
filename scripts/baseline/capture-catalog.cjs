const { Pool } = require('pg');
const fs = require('fs');
const connectionString = process.env.REHEARSAL_DATABASE_URL;
if (!connectionString) { console.error('REHEARSAL_DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
(async () => {
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  const roles = await pool.query(`SELECT rolname FROM pg_roles ORDER BY rolname`);
  fs.writeFileSync('backups/catalog-tables.json', JSON.stringify(tables.rows, null, 2));
  fs.writeFileSync('backups/roles.json', JSON.stringify(roles.rows, null, 2));
  console.log('Catalog and roles captured successfully');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
