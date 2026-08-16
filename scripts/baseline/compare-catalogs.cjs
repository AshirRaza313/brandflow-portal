// scripts/baseline/compare-catalogs.cjs
// Compares production and rehearsal full catalogs for structural differences.
// Exits with code 0 on NO_DIFFS, code 1 on any structural difference.
// Used in CI to prevent schema drift from reaching production.

const fs = require('fs');
const prodPath = process.env.PROD_CATALOG || 'backups/production-full-catalog.json';
const rehPath = process.env.REH_CATALOG || 'backups/rehearsal-full-catalog.json';
if (!fs.existsSync(prodPath) || !fs.existsSync(rehPath)) {
  console.error('Catalog files not found');
  console.error('Expected:', prodPath);
  console.error('Expected:', rehPath);
  process.exit(1);
}
const prod = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
const reh = JSON.parse(fs.readFileSync(rehPath, 'utf8'));

const diffs = [];
const allTables = new Set([...Object.keys(prod), ...Object.keys(reh)]);

for (const table of allTables) {
  if (!prod[table]) { diffs.push(`TABLE_MISSING_IN_PRODUCTION: ${table}`); continue; }
  if (!reh[table]) { diffs.push(`TABLE_MISSING_IN_REHEARSAL: ${table}`); continue; }

  // Column comparison
  const pCols = prod[table].columns || [];
  const rCols = reh[table].columns || [];
  const pColMap = new Map(pCols.map(c => [c.column_name, c]));
  const rColMap = new Map(rCols.map(c => [c.column_name, c]));
  const cols = new Set([...pColMap.keys(), ...rColMap.keys()]);

  for (const col of cols) {
    if (!pColMap.has(col)) { diffs.push(`COLUMN_MISSING_IN_PRODUCTION: ${table}.${col}`); continue; }
    if (!rColMap.has(col)) { diffs.push(`COLUMN_MISSING_IN_REHEARSAL: ${table}.${col}`); continue; }

    const pc = pColMap.get(col);
    const rc = rColMap.get(col);

    // Core type checks
    if (pc.data_type !== rc.data_type) diffs.push(`COLUMN_TYPE_DIFF: ${table}.${col} prod=${pc.data_type} reh=${rc.data_type}`);
    if (pc.is_nullable !== rc.is_nullable) diffs.push(`COLUMN_NULLABLE_DIFF: ${table}.${col} prod=${pc.is_nullable} reh=${rc.is_nullable}`);
    if ((pc.column_default ?? null) !== (rc.column_default ?? null)) diffs.push(`COLUMN_DEFAULT_DIFF: ${table}.${col}`);

    // Extended type metadata checks
    if ((pc.character_maximum_length ?? null) !== (rc.character_maximum_length ?? null)) {
      diffs.push(`COLUMN_LENGTH_DIFF: ${table}.${col} prod=${pc.character_maximum_length} reh=${rc.character_maximum_length}`);
    }
    if ((pc.numeric_precision ?? null) !== (rc.numeric_precision ?? null)) {
      diffs.push(`COLUMN_PRECISION_DIFF: ${table}.${col} prod=${pc.numeric_precision} reh=${rc.numeric_precision}`);
    }
    if ((pc.numeric_scale ?? null) !== (rc.numeric_scale ?? null)) {
      diffs.push(`COLUMN_SCALE_DIFF: ${table}.${col} prod=${pc.numeric_scale} reh=${rc.numeric_scale}`);
    }
    if ((pc.udt_name ?? null) !== (rc.udt_name ?? null)) {
      diffs.push(`COLUMN_UDT_DIFF: ${table}.${col} prod=${pc.udt_name} reh=${rc.udt_name}`);
    }
    if ((pc.is_identity ?? null) !== (rc.is_identity ?? null)) {
      diffs.push(`COLUMN_IDENTITY_DIFF: ${table}.${col} prod=${pc.is_identity} reh=${rc.is_identity}`);
    }
    if ((pc.is_generated ?? null) !== (rc.is_generated ?? null)) {
      diffs.push(`COLUMN_GENERATED_DIFF: ${table}.${col} prod=${pc.is_generated} reh=${rc.is_generated}`);
    }
  }

  // Constraint comparison
  const pCon = prod[table].constraints || [];
  const rCon = reh[table].constraints || [];
  const pConMap = new Map(pCon.map(c => [c.name, c]));
  const rConMap = new Map(rCon.map(c => [c.name, c]));
  const conNames = new Set([...pConMap.keys(), ...rConMap.keys()]);

  for (const cn of conNames) {
    if (!pConMap.has(cn)) { diffs.push(`CONSTRAINT_MISSING_IN_PRODUCTION: ${table}.${cn}`); continue; }
    if (!rConMap.has(cn)) { diffs.push(`CONSTRAINT_MISSING_IN_REHEARSAL: ${table}.${cn}`); continue; }
    if (pConMap.get(cn).definition !== rConMap.get(cn).definition) diffs.push(`CONSTRAINT_DEF_DIFF: ${table}.${cn}`);
  }

  // Index comparison
  const pIdx = prod[table].indexes || [];
  const rIdx = reh[table].indexes || [];
  const pIdxMap = new Map(pIdx.map(i => [i.name, i]));
  const rIdxMap = new Map(rIdx.map(i => [i.name, i]));
  const idxNames = new Set([...pIdxMap.keys(), ...rIdxMap.keys()]);

  for (const iname of idxNames) {
    if (!pIdxMap.has(iname)) { diffs.push(`INDEX_MISSING_IN_PRODUCTION: ${table}.${iname}`); continue; }
    if (!rIdxMap.has(iname)) { diffs.push(`INDEX_MISSING_IN_REHEARSAL: ${table}.${iname}`); continue; }
    if (pIdxMap.get(iname).definition !== rIdxMap.get(iname).definition) diffs.push(`INDEX_DEF_DIFF: ${table}.${iname}`);
  }
}

const report = diffs.length > 0 ? diffs.join('\n') : 'NO_DIFFS';
console.log(report);
fs.writeFileSync('docs/baseline-repair/catalog-comparison.txt', report + '\n');

// Non-zero exit on any structural difference.
// CI will fail the job, preventing schema drift from going unnoticed.
if (diffs.length > 0) {
  console.error('Catalog comparison found ' + diffs.length + ' difference(s)');
  process.exit(1);
}