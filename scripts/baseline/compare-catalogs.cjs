const fs = require('fs');
const prodPath = process.env.PROD_CATALOG || 'backups/production-full-catalog.json';
const rehPath = process.env.REH_CATALOG || 'backups/rehearsal-full-catalog.json';
if (!fs.existsSync(prodPath) || !fs.existsSync(rehPath)) {
  console.error('Catalog files not found');
  process.exit(1);
}
const prod = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
const reh = JSON.parse(fs.readFileSync(rehPath, 'utf8'));

const diffs = [];
const allTables = new Set([...Object.keys(prod), ...Object.keys(reh)]);
for (const table of allTables) {
  if (!prod[table]) { diffs.push(`TABLE_MISSING_IN_PRODUCTION: ${table}`); continue; }
  if (!reh[table]) { diffs.push(`TABLE_MISSING_IN_REHEARSAL: ${table}`); continue; }
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
    if (pc.data_type !== rc.data_type) diffs.push(`COLUMN_TYPE_DIFF: ${table}.${col} prod=${pc.data_type} reh=${rc.data_type}`);
    if (pc.is_nullable !== rc.is_nullable) diffs.push(`COLUMN_NULLABLE_DIFF: ${table}.${col} prod=${pc.is_nullable} reh=${rc.is_nullable}`);
    if ((pc.column_default ?? null) !== (rc.column_default ?? null)) diffs.push(`COLUMN_DEFAULT_DIFF: ${table}.${col}`);
  }
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