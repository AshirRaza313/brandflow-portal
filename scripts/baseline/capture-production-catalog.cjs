// scripts/baseline/capture-production-catalog.cjs
// Captures production database catalog with safety validation.
// ONLY run against approved production endpoints.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { Pool } = require('pg');

function validateProductionUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    // Block local/non-production endpoints
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      console.error('SAFETY: Production capture blocked - localhost detected. Use capture-full-catalog.cjs for local databases.');
      process.exit(1);
    }

    return {
      host: host,
      port: parseInt(parsed.port, 10) || 5432,
      database: parsed.pathname.slice(1),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      ssl: { rejectUnauthorized: false }
    };
  } catch (err) {
    console.error('SAFETY: Failed to parse production URL: ' + err.message);
    process.exit(1);
  }
}

async function main() {
  const connUrl = process.env.DATABASE_URL;
  if (!connUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const config = validateProductionUrl(connUrl);

  const pool = new Pool(config);
  const client = await pool.connect();

  try {
    // Compute head_sha before starting transaction (not a DB operation)
    let headSha = '';
    try {
      headSha = process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (e) {
      headSha = 'unknown';
    }

    // Start read-only transaction with consistent snapshot
    await client.query('START TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

    // Run all catalog queries inside the transaction
    let columns, constraints, indexes, tables, dbInfo, pgVersion;

    try {
      const results = await Promise.all([
        client.query(`
          SELECT c.table_name, c.column_name, c.data_type, c.is_nullable,
                 c.column_default, c.character_maximum_length,
                 c.numeric_precision, c.numeric_scale, c.udt_name,
                 c.is_identity, c.is_generated, c.collation_name,
                 c.ordinal_position, c.datetime_precision,
                 format_type(a.atttypid, a.atttypmod) as formatted_type
          FROM information_schema.columns c
          JOIN pg_attribute a ON a.attname = c.column_name JOIN pg_class cls ON cls.relname = c.table_name AND cls.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND a.attrelid = cls.oid AND a.attnum > 0 AND NOT a.attisdropped WHERE c.table_schema = 'public'
          ORDER BY c.table_name, c.ordinal_position
        `),
        client.query(`
          SELECT cls.relname as table_name, con.conname as name, con.contype as type,
                 pg_get_constraintdef(con.oid) as definition
          FROM pg_constraint con
          JOIN pg_namespace nsp ON nsp.oid = con.connamespace
          JOIN pg_class cls ON cls.oid = con.conrelid
          WHERE nsp.nspname = 'public'
          ORDER BY cls.relname, con.conname
        `),
        client.query(`
          SELECT schemaname, tablename AS table_name, indexname as name, indexdef as definition
          FROM pg_indexes
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname
        `),
        client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `),
        client.query('SELECT current_database()'),
        client.query('SELECT version()')
      ]);
      columns = results[0];
      constraints = results[1];
      indexes = results[2];
      tables = results[3];
      dbInfo = results[4];
      pgVersion = results[5];
    } catch (queryErr) {
      console.error('FATAL: Production catalog query failed - ' + queryErr.message);
      process.exit(1);
    }

    // Commit the read-only transaction
    await client.query('COMMIT');

    // Build catalog
    const catalog = {};
    for (const row of tables.rows) {
      catalog[row.table_name] = { columns: [], constraints: [], indexes: [] };
    }

    for (const row of columns.rows) {
      if (catalog[row.table_name]) {
        catalog[row.table_name].columns.push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
          character_maximum_length: row.character_maximum_length,
          numeric_precision: row.numeric_precision,
          numeric_scale: row.numeric_scale,
          udt_name: row.udt_name,
          is_identity: row.is_identity,
          is_generated: row.is_generated,
          collation_name: row.collation_name,
          ordinal_position: row.ordinal_position,
          datetime_precision: row.datetime_precision,
          formatted_type: row.formatted_type
        });
      }
    }

    for (const row of constraints.rows) {
      if (catalog[row.table_name]) {
        catalog[row.table_name].constraints.push({
          name: row.name,
          type: row.type,
          definition: row.definition
        });
      }
    }

    for (const row of indexes.rows) {
      if (catalog[row.table_name]) {
        catalog[row.table_name].indexes.push({
          name: row.name,
          definition: row.definition
        });
      }
    }

    // Compute catalog_sha256 BEFORE adding _provenance (avoids circular dependency)
    const catalogJson = JSON.stringify(catalog, null, 2);
    const catalogSha = crypto.createHash('sha256').update(catalogJson).digest('hex');

    // Compute script_sha (hash of this file's own content)
    const scriptContent = fs.readFileSync(__filename);
    const scriptSha = crypto.createHash('sha256').update(scriptContent).digest('hex');

    // 3R2: Assert queried-vs-attached row counts
    var _attC=0,_attCon=0,_attI=0;
    var _tk=Object.keys(catalog);
    for(var _ti=0;_ti<_tk.length;_ti++){_attC+=catalog[_tk[_ti]].columns.length;_attCon+=catalog[_tk[_ti]].constraints.length;_attI+=catalog[_tk[_ti]].indexes.length;}
    if(columns.rows.length!==_attC){console.error('FATAL: Column count mismatch - queried '+columns.rows.length+' attached '+_attC);process.exit(1);}
    if(constraints.rows.length!==_attCon){console.error('FATAL: Constraint count mismatch - queried '+constraints.rows.length+' attached '+_attCon);process.exit(1);}
    if(indexes.rows.length!==_attI){console.error('FATAL: Index count mismatch - queried '+indexes.rows.length+' attached '+_attI);process.exit(1);}

    // Add provenance envelope (underscore-prefixed key so comparator filters it out)
    catalog._provenance = {
      project_ref: require('../../package.json').name || 'valtriox-baseline',
      db_name: dbInfo.rows[0].current_database,
      captured_at_utc: new Date().toISOString(),
      pg_version: pgVersion.rows[0].version,
      head_sha: headSha,
      script_sha: scriptSha,
      catalog_sha256: catalogSha,
      transaction_mode: 'repeatable_read_read_only',
      snapshot_taken: true
    };

    // 3R1: Output path matches compare-catalogs.cjs default
    const outputPath = 'backups/production-full-catalog.json';
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
    console.log('Production catalog captured: ' + outputPath + ' (' + tables.rows.length + ' tables)');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});

