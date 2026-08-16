const { Pool } = require('pg');
const fs = require('fs');
const url = process.env.CATALOG_DB_URL;
if (!url) {
  console.error('CATALOG_DB_URL not set');
  process.exit(1);
}
const outputFile = process.env.CATALOG_OUTPUT || 'backups/full-catalog.json';
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function capture() {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const catalog = {};
  for (const t of tables.rows) {
    const name = t.table_name;
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [name]);
    catalog[name] = {
      columns: columns.rows,
      constraints: [],
      indexes: [],
    };
  }

  const constraints = await pool.query(`
    SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY table_name, conname
  `);
  for (const c of constraints.rows) {
    if (catalog[c.table_name]) {
      catalog[c.table_name].constraints.push({
        name: c.conname,
        type: c.contype,
        definition: c.definition,
      });
    }
  }

  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  for (const i of indexes.rows) {
    if (catalog[i.tablename]) {
      catalog[i.tablename].indexes.push({
        name: i.indexname,
        definition: i.indexdef,
      });
    }
  }

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(catalog, null, 2));
  console.log('Full catalog captured to', outputFile, 'tables:', Object.keys(catalog).length);
  await pool.end();
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});