// scripts/baseline/export-sql-dump.cjs
// Generates schema + data + roles SQL dumps from rehearsal database.
// Safety guard: rejects production, validates CI credentials, enforces staging allowlist.

var Pool = require("pg").Pool;
var fs = require("fs");
var validateRehearsalUrl = require("./safety-guard.cjs").validateRehearsalUrl;

var parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
var connectionString = process.env.REHEARSAL_DATABASE_URL;

var pool = new Pool({
  connectionString: connectionString,
  ssl: parsed.isLocal ? undefined : { rejectUnauthorized: false },
});

async function schemaDump() {
  var tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
    ORDER BY table_name
  `);

  var ddl = '-- Schema dump generated from rehearsal DB\n\n';
  for (var i = 0; i < tables.rows.length; i++) {
    var tableName = tables.rows[i].table_name;
    var columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    ddl += 'CREATE TABLE "public"."' + tableName + '" (\n';
    var colDefs = columns.rows.map(function (c) {
      var def = '  "' + c.column_name + '" ' + c.data_type;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      if (c.column_default) def += ' DEFAULT ' + c.column_default;
      return def;
    });
    ddl += colDefs.join(',\n');
    ddl += '\n);\n\n';
  }

  // Indexes
  var indexes = await pool.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    ORDER BY tablename, indexname
  `);
  ddl += '-- Indexes\n';
  for (var j = 0; j < indexes.rows.length; j++) {
    ddl += indexes.rows[j].indexdef + ';\n';
  }

  // Constraints: join pg_class for unquoted table names.
  // Previously used conrelid::regclass which produces quoted names
  // for mixed-case tables, causing ALTER TABLE with wrong identifiers.
  var constraints = await pool.query(`
    SELECT
      c.relname AS table_name,
      con.contype,
      con.conname,
      pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY c.relname, con.conname
  `);
  ddl += '\n-- Constraints\n';
  for (var k = 0; k < constraints.rows.length; k++) {
    var cr = constraints.rows[k];
    if (cr.contype === 'p' || cr.contype === 'f' || cr.contype === 'c') {
      ddl += 'ALTER TABLE "public"."' + cr.table_name + '" ADD CONSTRAINT "' + cr.conname + '" ' + cr.definition + ';\n';
    }
  }

  return ddl;
}

async function dataDump() {
  var tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name != '_prisma_migrations'
    ORDER BY table_name
  `);

  var sql = '-- Data dump generated from rehearsal DB\n\n';
  for (var i = 0; i < tables.rows.length; i++) {
    var tableName = tables.rows[i].table_name;
    var result = await pool.query('SELECT * FROM "public"."' + tableName + '"');
    if (result.rows.length === 0) continue;
    var cols = Object.keys(result.rows[0]);
    sql += 'COPY "public"."' + tableName + '" (' + cols.map(function (c) { return '"' + c + '"'; }).join(', ') + ') FROM stdin;\n';
    for (var j = 0; j < result.rows.length; j++) {
      var row = result.rows[j];
      sql += cols.map(function (c) {
        var v = row[c];
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
  var roles = await pool.query(
    'SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles ORDER BY rolname'
  );
  var sql = '-- Roles dump (sanitized)\n\n';
  for (var i = 0; i < roles.rows.length; i++) {
    var r = roles.rows[i];
    sql += '-- role: ' + r.rolname + ', superuser: ' + r.rolsuper + ', createdb: ' + r.rolcreatedb + ', createrole: ' + r.rolcreaterole + ', canlogin: ' + r.rolcanlogin + '\n';
  }
  return sql;
}

(async () => {
  var schema = await schemaDump();
  var data = await dataDump();
  var roles = await rolesDump();

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync('backups/valtriox-schema-20260816.sql', schema);
  fs.writeFileSync('backups/valtriox-data-20260816.sql', data);
  fs.writeFileSync('backups/valtriox-roles-20260816.sql', roles);

  console.log('SQL dumps generated successfully in backups/');
  console.log('Schema bytes:', schema.length);
  console.log('Data bytes:', data.length);
  console.log('Roles bytes:', roles.length);

  await pool.end();
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});