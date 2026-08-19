// scripts/baseline/compare-catalogs.cjs
// Compares production and rehearsal full catalogs for structural differences.
// Exits with code 0 on NO_DIFFS, code 1 on any structural difference.
// Used in CI to prevent schema drift from reaching production.
// Batch A: 4R1 typo fix, 4R2 complete metadata, 5R1-5R5 full validation.

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

// --- 5R1/5R2/5R3/5R5: Full catalog structure validation (every table) ---
function validateCatalogStructure(label, catalog) {
  var keys = Object.keys(catalog).filter(function(k) { return !k.startsWith('_'); });
  if (keys.length === 0) {
    diffs.push('FATAL: ' + label + ' catalog is empty (0 tables)');
    return false;
  }
  for (var t = 0; t < keys.length; t++) {
    var table = keys[t];
    var entry = catalog[table];
    if (!entry || typeof entry !== 'object') {
      diffs.push('MALFORMED_TABLE: ' + label + '.' + table + ' - not an object');
      continue;
    }
    if (!Array.isArray(entry.columns)) {
      diffs.push('MALFORMED_TABLE: ' + label + '.' + table + ' - columns is not an array');
      continue;
    }
    if (!Array.isArray(entry.constraints)) {
      diffs.push('MALFORMED_TABLE: ' + label + '.' + table + ' - constraints is not an array');
      continue;
    }
    if (!Array.isArray(entry.indexes)) {
      diffs.push('MALFORMED_TABLE: ' + label + '.' + table + ' - indexes is not an array');
      continue;
    }
    // 5R5: non-empty columns required
    if (entry.columns.length === 0) {
      diffs.push('MALFORMED_TABLE: ' + label + '.' + table + ' - columns array is empty');
    }
    // 5R2: Required typed fields for columns
    var reqColFields = ['column_name', 'data_type', 'is_nullable'];
    for (var ci = 0; ci < entry.columns.length; ci++) {
      var col = entry.columns[ci];
      for (var fi = 0; fi < reqColFields.length; fi++) {
        if (typeof col[reqColFields[fi]] !== 'string') {
          diffs.push('MALFORMED_COLUMN: ' + label + '.' + table + '.' + (col.column_name || '?') + ' - ' + reqColFields[fi] + ' is not a string');
        }
      }
      if (col.formatted_type !== undefined && typeof col.formatted_type !== 'string') diffs.push('MALFORMED_COLUMN: ' + label + '.' + table + '.' + (col.column_name || '?') + ' - formatted_type is not a string');
      if (col.ordinal_position !== undefined && typeof col.ordinal_position !== 'number') {
        diffs.push('MALFORMED_COLUMN: ' + label + '.' + table + '.' + (col.column_name || '?') + ' - ordinal_position is not a number');
      }
    }
    // 5R2: Required typed fields for constraints
    for (var cni = 0; cni < entry.constraints.length; cni++) {
      var con = entry.constraints[cni];
      if (typeof con.name !== 'string') diffs.push('MALFORMED_CONSTRAINT: ' + label + '.' + table + ' - name is not a string');
      if (typeof con.type !== 'string') diffs.push('MALFORMED_CONSTRAINT: ' + label + '.' + table + '.' + (con.name || '?') + ' - type is not a string');
      if (typeof con.definition !== 'string') diffs.push('MALFORMED_CONSTRAINT: ' + label + '.' + table + '.' + (con.name || '?') + ' - definition is not a string');
    }
    // 5R2: Required typed fields for indexes
    for (var ii = 0; ii < entry.indexes.length; ii++) {
      var idx = entry.indexes[ii];
      if (typeof idx.name !== 'string') diffs.push('MALFORMED_INDEX: ' + label + '.' + table + ' - name is not a string');
      if (typeof idx.definition !== 'string') diffs.push('MALFORMED_INDEX: ' + label + '.' + table + '.' + (idx.name || '?') + ' - definition is not a string');
    }
    // 5R3: Duplicate column names
    var colNames = entry.columns.map(function(c) { return c.column_name; });
    var colSet = new Set(colNames);
    if (colSet.size !== colNames.length) {
      var dupes = colNames.filter(function(n, i) { return colNames.indexOf(n) !== i; });
      diffs.push('DUPLICATE_COLUMNS: ' + label + '.' + table + ' - ' + Array.from(new Set(dupes)).join(', '));
    }
    // 5R3: Duplicate constraint names
    var conNames = entry.constraints.map(function(c) { return c.name; });
    var conSet = new Set(conNames);
    if (conSet.size !== conNames.length) {
      var cDupes = conNames.filter(function(n, i) { return conNames.indexOf(n) !== i; });
      diffs.push('DUPLICATE_CONSTRAINTS: ' + label + '.' + table + ' - ' + Array.from(new Set(cDupes)).join(', '));
    }
    // 5R3: Duplicate index names
    var idxNames = entry.indexes.map(function(c) { return c.name; });
    var idxSet = new Set(idxNames);
    if (idxSet.size !== idxNames.length) {
      var iDupes = idxNames.filter(function(n, i) { return idxNames.indexOf(n) !== i; });
      diffs.push('DUPLICATE_INDEXES: ' + label + '.' + table + ' - ' + Array.from(new Set(iDupes)).join(', '));
    }
  }
  return diffs.length === 0;
}

var prodValid = validateCatalogStructure('production', prod);
var rehValid = validateCatalogStructure('rehearsal', reh);

if (!prodValid || !rehValid) {
  console.error('Catalog structure validation failed');
  var report = diffs.join('\n');
  console.log(report);
  fs.mkdirSync('docs/baseline-repair', { recursive: true });
  fs.writeFileSync('docs/baseline-repair/catalog-comparison.txt', report + '\n');
  process.exit(1);
}

var prodKeys = Object.keys(prod).filter(function(k) { return !k.startsWith('_'); });
var rehKeys = Object.keys(reh).filter(function(k) { return !k.startsWith('_'); });

// --- 5R4: Exact table count verification ---
if (prodKeys.length !== rehKeys.length) {
  diffs.push('TABLE_COUNT_DIFF: production=' + prodKeys.length + ' rehearsal=' + rehKeys.length);
}
var APPROVED_TABLES = new Set(['Account','Attendance','Automation','BetaInvite','ClientMessage','Coupon','Customer','EmailTemplate','Expense','Feedback','IntegrationConnection','Invoice','Lead','LegalPage','Notification','Order','OrderItem','Organization','OrganizationMember','PaymentProof','PlatformDocument','PlatformSettings','Product','Proposal','PushSubscription','ReportExport','Role','Session','Subscription','SubscriptionPlan','SupportConversation','SupportMessage','SystemSetting','TeamInvitation','TeamTask','User','ValtrioxTeamInvitation','ValtrioxTeamMember','VerificationToken','suppliers']);
var _allN = [].concat(prodKeys, rehKeys);
  for (var _a = 0; _a < _allN.length; _a++) { if (!APPROVED_TABLES.has(_allN[_a])) diffs.push('UNAPPROVED_TABLE: ' + _allN[_a] + ' is not in the approved 40-table set'); }

// Exact 40-table set enforcement (CATALOG_TEST_MODE skips for unit tests)
if (!process.env.CATALOG_TEST_MODE) {
  if (prodKeys.length !== 40) diffs.push('EXACT_TABLE_COUNT: production catalog has ' + prodKeys.length + ' tables, expected exactly 40');
  if (rehKeys.length !== 40) diffs.push('EXACT_TABLE_COUNT: rehearsal catalog has ' + rehKeys.length + ' tables, expected exactly 40');
  var _approvedArr = Array.from(APPROVED_TABLES);
  for (var _p = 0; _p < _approvedArr.length; _p++) {
    if (prodKeys.indexOf(_approvedArr[_p]) === -1) diffs.push('MISSING_APPROVED_TABLE: ' + _approvedArr[_p] + ' missing in production catalog');
    if (rehKeys.indexOf(_approvedArr[_p]) === -1) diffs.push('MISSING_APPROVED_TABLE: ' + _approvedArr[_p] + ' missing in rehearsal catalog');
  }
}

console.log('Catalogs loaded: production=' + prodKeys.length + ' tables, rehearsal=' + rehKeys.length + ' tables');

var allTables = new Set([].concat(prodKeys, rehKeys));

for (var _i = 0, _arr = Array.from(allTables); _i < _arr.length; _i++) {
  var table = _arr[_i];
  if (!prod[table]) { diffs.push('TABLE_MISSING_IN_PRODUCTION: ' + table); continue; }
  if (!reh[table]) { diffs.push('TABLE_MISSING_IN_REHEARSAL: ' + table); continue; }

  var pCols = prod[table].columns || [];
  var rCols = reh[table].columns || [];

  if (pCols.length !== rCols.length) {
    diffs.push('COLUMN_COUNT_DIFF: ' + table + ' prod=' + pCols.length + ' reh=' + rCols.length);
  }

  var maxColLen = Math.max(pCols.length, rCols.length);
  for (var oi = 0; oi < maxColLen; oi++) {
    var pName = pCols[oi] ? pCols[oi].column_name : undefined;
    var rName = rCols[oi] ? rCols[oi].column_name : undefined;
    if (pName !== rName) {
      diffs.push('COLUMN_ORDER_DIFF: ' + table + ' position=' + oi + ' prod=' + pName + ' reh=' + rName);
    }
  }

  var pColMap = new Map(pCols.map(function(c) { return [c.column_name, c]; }));
  var rColMap = new Map(rCols.map(function(c) { return [c.column_name, c]; }));
  var cols = new Set([].concat(Array.from(pColMap.keys()), Array.from(rColMap.keys())));

  for (var _j = 0, _arr2 = Array.from(cols); _j < _arr2.length; _j++) {
    var col = _arr2[_j];
    if (!pColMap.has(col)) { diffs.push('COLUMN_MISSING_IN_PRODUCTION: ' + table + '.' + col); continue; }
    if (!rColMap.has(col)) { diffs.push('COLUMN_MISSING_IN_REHEARSAL: ' + table + '.' + col); continue; }
    var pc = pColMap.get(col);
    var rc = rColMap.get(col);
    if (pc.data_type !== rc.data_type) diffs.push('COLUMN_TYPE_DIFF: ' + table + '.' + col + ' prod=' + pc.data_type + ' reh=' + rc.data_type);
    if (pc.is_nullable !== rc.is_nullable) diffs.push('COLUMN_NULLABLE_DIFF: ' + table + '.' + col + ' prod=' + pc.is_nullable + ' reh=' + rc.is_nullable);
    if ((pc.column_default ?? null) !== (rc.column_default ?? null)) diffs.push('COLUMN_DEFAULT_DIFF: ' + table + '.' + col);
    if ((pc.character_maximum_length ?? null) !== (rc.character_maximum_length ?? null)) diffs.push('COLUMN_LENGTH_DIFF: ' + table + '.' + col + ' prod=' + pc.character_maximum_length + ' reh=' + rc.character_maximum_length);
    if ((pc.numeric_precision ?? null) !== (rc.numeric_precision ?? null)) diffs.push('COLUMN_PRECISION_DIFF: ' + table + '.' + col + ' prod=' + pc.numeric_precision + ' reh=' + rc.numeric_precision);
    if ((pc.numeric_scale ?? null) !== (rc.numeric_scale ?? null)) diffs.push('COLUMN_SCALE_DIFF: ' + table + '.' + col + ' prod=' + pc.numeric_scale + ' reh=' + rc.numeric_scale);
    if ((pc.udt_name ?? null) !== (rc.udt_name ?? null)) diffs.push('COLUMN_UDT_DIFF: ' + table + '.' + col + ' prod=' + pc.udt_name + ' reh=' + rc.udt_name);
    // 4R1 FIX: was pc.is_identity, now rc.is_identity
    if ((pc.is_identity ?? null) !== (rc.is_identity ?? null)) diffs.push('COLUMN_IDENTITY_DIFF: ' + table + '.' + col + ' prod=' + pc.is_identity + ' reh=' + rc.is_identity);
    if ((pc.is_generated ?? null) !== (rc.is_generated ?? null)) diffs.push('COLUMN_GENERATED_DIFF: ' + table + '.' + col + ' prod=' + pc.is_generated + ' reh=' + rc.is_generated);
    if ((pc.collation_name ?? null) !== (rc.collation_name ?? null)) diffs.push('COLUMN_COLLATION_DIFF: ' + table + '.' + col + ' prod=' + pc.collation_name + ' reh=' + rc.collation_name);
    // 4R2: One-sided metadata gap detection (non-fatal, prompts fixture regeneration)
    if ((pc.formatted_type !== undefined) !== (rc.formatted_type !== undefined)) console.log('METADATA_SIDE_GAP: ' + table + '.' + col + ' - formatted_type present on ' + (pc.formatted_type !== undefined ? 'production' : 'rehearsal') + ' only');
    if ((pc.ordinal_position !== undefined) !== (rc.ordinal_position !== undefined)) console.log('METADATA_SIDE_GAP: ' + table + '.' + col + ' - ordinal_position present on ' + (pc.ordinal_position !== undefined ? 'production' : 'rehearsal') + ' only');
    if ((pc.datetime_precision !== undefined) !== (rc.datetime_precision !== undefined)) console.log('METADATA_SIDE_GAP: ' + table + '.' + col + ' - datetime_precision present on ' + (pc.datetime_precision !== undefined ? 'production' : 'rehearsal') + ' only');
    // 4R2: Soft metadata comparisons (only when both sides have the value)
    if (pc.datetime_precision !== undefined && rc.datetime_precision !== undefined && pc.datetime_precision !== rc.datetime_precision) diffs.push('COLUMN_DATETIME_PRECISION_DIFF: ' + table + '.' + col + ' prod=' + pc.datetime_precision + ' reh=' + rc.datetime_precision);
    if (pc.ordinal_position !== undefined && rc.ordinal_position !== undefined && pc.ordinal_position !== rc.ordinal_position) diffs.push('COLUMN_ORDINAL_POSITION_DIFF: ' + table + '.' + col + ' prod=' + pc.ordinal_position + ' reh=' + rc.ordinal_position);
    if (pc.formatted_type !== undefined && rc.formatted_type !== undefined && pc.formatted_type !== rc.formatted_type) diffs.push('COLUMN_FORMATTED_TYPE_DIFF: ' + table + '.' + col + ' prod=' + pc.formatted_type + ' reh=' + rc.formatted_type);
  }

  var pCon = prod[table].constraints || [];
  var rCon = reh[table].constraints || [];
  if (pCon.length !== rCon.length) diffs.push('CONSTRAINT_COUNT_DIFF: ' + table + ' prod=' + pCon.length + ' reh=' + rCon.length);
  var pConMap = new Map(pCon.map(function(c) { return [c.name, c]; }));
  var rConMap = new Map(rCon.map(function(c) { return [c.name, c]; }));
  var conNames = new Set([].concat(Array.from(pConMap.keys()), Array.from(rConMap.keys())));
  for (var _k = 0, _arr3 = Array.from(conNames); _k < _arr3.length; _k++) {
    var cn = _arr3[_k];
    if (!pConMap.has(cn)) { diffs.push('CONSTRAINT_MISSING_IN_PRODUCTION: ' + table + '.' + cn); continue; }
    if (!rConMap.has(cn)) { diffs.push('CONSTRAINT_MISSING_IN_REHEARSAL: ' + table + '.' + cn); continue; }
    if (pConMap.get(cn).type !== rConMap.get(cn).type) diffs.push('CONSTRAINT_TYPE_DIFF: ' + table + '.' + cn + ' prod=' + pConMap.get(cn).type + ' reh=' + rConMap.get(cn).type);
    if (pConMap.get(cn).definition !== rConMap.get(cn).definition) diffs.push('CONSTRAINT_DEF_DIFF: ' + table + '.' + cn);
  }

  var pIdx = prod[table].indexes || [];
  var rIdx = reh[table].indexes || [];
  if (pIdx.length !== rIdx.length) diffs.push('INDEX_COUNT_DIFF: ' + table + ' prod=' + pIdx.length + ' reh=' + rIdx.length);
  var pIdxMap = new Map(pIdx.map(function(i) { return [i.name, i]; }));
  var rIdxMap = new Map(rIdx.map(function(i) { return [i.name, i]; }));
  var idxNames = new Set([].concat(Array.from(pIdxMap.keys()), Array.from(rIdxMap.keys())));
  for (var _l = 0, _arr4 = Array.from(idxNames); _l < _arr4.length; _l++) {
    var iname = _arr4[_l];
    if (!pIdxMap.has(iname)) { diffs.push('INDEX_MISSING_IN_PRODUCTION: ' + table + '.' + iname); continue; }
    if (!rIdxMap.has(iname)) { diffs.push('INDEX_MISSING_IN_REHEARSAL: ' + table + '.' + iname); continue; }
    if (pIdxMap.get(iname).definition !== rIdxMap.get(iname).definition) diffs.push('INDEX_DEF_DIFF: ' + table + '.' + iname);
  }
}

var report = diffs.length > 0 ? diffs.join('\n') : 'NO_DIFFS';
console.log(report);
fs.mkdirSync('docs/baseline-repair', { recursive: true });
fs.writeFileSync('docs/baseline-repair/catalog-comparison.txt', report + '\n');

if (diffs.length > 0) {
  console.error('Catalog comparison found ' + diffs.length + ' difference(s)');
  process.exit(1);
}


