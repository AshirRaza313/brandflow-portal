const fs = require('fs');
const { Pool } = require('pg');
const connectionString = process.env.PRODUCTION_DATABASE_URL;
if (!connectionString) {
  console.error('PRODUCTION_DATABASE_URL not set');
  process.exit(1);
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
(async () => {
  const tables = await pool.query(`
    SELECT table_name,
           (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=t.table_name) AS column_count
    FROM information_schema.tables t
    WHERE table_schema='public'
    ORDER BY table_name
  `);
  const constraints = await pool.query(`
    SELECT conrelid::regclass AS table_name, contype, conname
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, conname
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