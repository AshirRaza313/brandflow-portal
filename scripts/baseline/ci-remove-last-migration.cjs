// scripts/baseline/ci-remove-last-migration.cjs
// Finds the last applied migration, deletes it from _prisma_migrations,
// and outputs the name (for GITHUB_ENV capture).
// Used in CI Path B to simulate a pending migration.

const { Pool } = require('pg');

var pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  var r = await pool.query(
    'SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1'
  );
  if (r.rows.length === 0) {
    console.error('FATAL: No migrations found in _prisma_migrations');
    process.exit(1);
  }
  var name = r.rows[0].migration_name;
  await pool.query('DELETE FROM _prisma_migrations WHERE migration_name = $1', [name]);
  // Output migration name to stdout for GITHUB_ENV capture
  console.log(name);
  await pool.end();
})().catch(function(e) { console.error(e); process.exit(1); });