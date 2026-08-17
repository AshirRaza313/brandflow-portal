// scripts/baseline/ci-verify-migration.cjs
// Verifies a migration exists in _prisma_migrations after resolve.
// Usage: node scripts/baseline/ci-verify-migration.cjs <migration_name>

const { Pool } = require('pg');

var name = process.argv[2];
if (!name) { console.error('Usage: node ci-verify-migration.cjs <migration_name>'); process.exit(1); }

var pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  var r = await pool.query(
    'SELECT migration_name, applied_steps_count FROM _prisma_migrations WHERE migration_name = $1',
    [name]
  );
  if (r.rows.length === 0) {
    console.error('FATAL: migration ' + name + ' not found in _prisma_migrations after resolve');
    process.exit(1);
  }
  console.log('MIGRATION HISTORY PROOF:');
  console.log('  name: ' + r.rows[0].migration_name);
  console.log('  steps: ' + r.rows[0].applied_steps_count);
  await pool.end();
})().catch(function(e) { console.error(e); process.exit(1); });