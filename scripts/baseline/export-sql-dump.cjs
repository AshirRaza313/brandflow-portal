const { Pool } = require('pg');
const fs = require('fs');
const connectionString = process.env.REHEARSAL_DATABASE_URL;
if (!connectionString) {
  console.error('REHEARSAL_DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function schemaDump() {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
    ORDER BY table_name
  `);

  let ddl = '-- Schema dump generated from rehearsal DB\n\n';
  for (const t of tables.rows) {
    const tableName = t.table_name;
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    ddl += `CREATE TABLE "public"."${tableName}" (\n`;
    const colDefs = columns.rows.map((c) => {
      let def = `  "${c.column_name}" ${c.data_type}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      return def;
    });
    ddl += colDefs.join(',\n');
    ddl += '\n);\n\n';
  }

  // Indexes
  const indexes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    ORDER BY tablename, indexname
  `);
  ddl += '-- Indexes\n';
  for (const idx of indexes.rows) {
    ddl += `${idx.indexdef};\n`;
  }

  // Constraints (non-primary/foreign/check)
  const constraints = await pool.query(`
    SELECT conrelid::regclass AS table_name, contype, conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, conname
  `);
  ddl += '\n-- Constraints\n';
  for (const c of constraints.rows) {
    if (['p', 'f', 'c'].includes(c.contype)) {
      ddl += `ALTER TABLE "public"."${c.table_name}" ADD CONSTRAINT "${c.conname}" ${c.definition};\n`;
    }
  }

  return ddl;
}

async function dataDump() {
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
    ORDER BY table_name
  `);

  let sql = '-- Data dump generated from rehearsal DB\n\n';
  for (const t of tables.rows) {
    const tableName = t.table_name;
    const result = await pool.query(`SELECT * FROM "public"."${tableName}"`);
    if (result.rows.length === 0) continue;
    const cols = Object.keys(result.rows[0]);
    sql += `COPY "public"."${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) FROM stdin;\n`;
    for (const row of result.rows) {
      sql += cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return '\\N';
        if (typeof v === 'string') return v.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return String(v);
      }).join('\t') + '\n';
    }
    sql += '\\.\n\n';
  }
  return sql;
}

async function rolesDump() {
  const roles = await pool.query(`SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles ORDER BY rolname`);
  let sql = '-- Roles dump (sanitized)\n\n';
  for (const r of roles.rows) {
    sql += `-- role: ${r.rolname}, superuser: ${r.rolsuper}, createdb: ${r.rolcreatedb}, createrole: ${r.rolcreaterole}, canlogin: ${r.rolcanlogin}\n`;
  }
  return sql;
}

(async () => {
  const schema = await schemaDump();
  const data = await dataDump();
  const roles = await rolesDump();

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/valtriox-schema-20260816.sql', schema);
  fs.writeFileSync('backups/valtriox-data-20260816.sql', data);
  fs.writeFileSync('backups/valtriox-roles-20260816.sql', roles);

  console.log('SQL dumps generated successfully in backups/');
  console.log('Schema bytes:', schema.length);
  console.log('Data bytes:', data.length);
  console.log('Roles bytes:', roles.length);

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});