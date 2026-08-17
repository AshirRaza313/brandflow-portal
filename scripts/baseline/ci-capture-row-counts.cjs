// scripts/baseline/ci-capture-row-counts.cjs
// Captures row counts for all public tables. Used in CI for Path B verification.
// Usage: node scripts/baseline/ci-capture-row-counts.cjs <label>
// Env: DATABASE_URL must be set

const fs = require('fs');
const { Pool } = require('pg');

var label = process.argv[2];
if (!label) { console.error('Usage: node ci-capture-row-counts.cjs <label>'); process.exit(1); }
var url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

var pool = new Pool({ connectionString: url });

(async () => {
  var tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  );
  var counts = [];
  for (var i = 0; i < tables.rows.length; i++) {
    var name = tables.rows[i].table_name;
    var r = await pool.query('SELECT COUNT(*)::int AS count FROM "public"."' + name + '"');
    counts.push({ table: name, rows: r.rows[0].count });
  }
  var data = {
    label: label,
    capturedAt: new Date().toISOString(),
    counts: counts
  };
  fs.mkdirSync('backups', { recursive: true });
  var filename = 'backups/' + label + '-row-counts.json';
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(label + ': ' + counts.length + ' tables captured to ' + filename);
  await pool.end();
})().catch(function(e) { console.error(e); process.exit(1); });