// tests/baseline/catalog-validation.test.cjs
// Regression tests for compare-catalogs.cjs - Batch A closeout (Issues 1-7)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const compareScript = path.join(projectRoot, 'scripts', 'baseline', 'compare-catalogs.cjs');

function validColumn(name, pos) {
  return {
    column_name: name,
    data_type: 'integer',
    is_nullable: 'NO',
    column_default: null,
    character_maximum_length: null,
    numeric_precision: null,
    numeric_scale: null,
    udt_name: 'int4',
    is_identity: 'NO',
    is_generated: 'NEVER',
    collation_name: null,
    ordinal_position: pos,
    datetime_precision: null,
    formatted_type: 'integer'
  };
}

function validTable(colNames) {
  return {
    columns: colNames.map(function (name, i) { return validColumn(name, i + 1); }),
    constraints: [],
    indexes: []
  };
}

function runCompare(prodPath, rehPath) {
  var env = Object.assign({}, process.env, {
    PROD_CATALOG: prodPath,
    REH_CATALOG: rehPath,
    CATALOG_TEST_MODE: '1'
  });
  try {
    var stdout = execFileSync('node', [compareScript], {
      env: env,
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return { stdout: stdout, status: 0 };
  } catch (err) {
    return { stdout: (err.stdout || '').toString(), status: err.status || 1 };
  }
}

function norm(str) {
  return str.replace(/\r\n/g, '\n');
}

var passed = 0;
var failed = 0;

function assert(testName, condition, detail) {
  if (condition) {
    console.log('  PASS: ' + testName);
    passed++;
  } else {
    console.log('  FAIL: ' + testName + (detail ? ' - ' + detail : ''));
    failed++;
  }
}

// Test 1: Malformed first table - columns is a string, not an array
function test1() {
  console.log('\nTest 1: Malformed first table - columns is not an array');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCatalog = {
      "BrokenTable": {
        columns: "not an array",
        constraints: [],
        indexes: []
      }
    };
    var rehCatalog = {
      "BrokenTable": {
        columns: [],
        constraints: [],
        indexes: []
      }
    };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(prodCatalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(rehCatalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains MALFORMED_TABLE', out.includes('MALFORMED_TABLE'), 'output: ' + out.slice(0, 300));
    assert('Contains columns is not an array', out.includes('columns is not an array'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 2: Malformed second table - first table valid, second table constraints is string
function test2() {
  console.log('\nTest 2: Malformed second table - constraints is not an array');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCatalog = {
      "ValidTable": validTable(['id', 'name']),
      "BrokenTable": {
        columns: [validColumn('id', 1)],
        constraints: "invalid",
        indexes: []
      }
    };
    var rehCatalog = {
      "ValidTable": validTable(['id', 'name']),
      "BrokenTable": validTable(['id'])
    };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(prodCatalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(rehCatalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains MALFORMED_TABLE', out.includes('MALFORMED_TABLE'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 3: Duplicate column names within same table
function test3() {
  console.log('\nTest 3: Duplicate column names');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCatalog = {
      "DupTable": {
        columns: [validColumn('id', 1), validColumn('id', 2)],
        constraints: [],
        indexes: []
      }
    };
    var rehCatalog = {
      "DupTable": validTable(['id'])
    };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(prodCatalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(rehCatalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains DUPLICATE_COLUMNS', out.includes('DUPLICATE_COLUMNS'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 4: Valid identical catalogs - should pass with no diffs
function test4() {
  console.log('\nTest 4: Valid identical catalogs (no diffs)');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var validCatalog = {
      "User": validTable(['id', 'email', 'name']),
      "Account": validTable(['id', 'user_id', 'total'])
    };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(validCatalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(validCatalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 0', result.status === 0, 'got ' + result.status);
    assert('Contains NO_DIFFS', out.includes('NO_DIFFS'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 5: UNAPPROVED_TABLE rejection
function test5() {
  console.log('\nTest 5: UNAPPROVED_TABLE rejection');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var catalog = { "HackedTable": validTable(['id']) };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(catalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(catalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains UNAPPROVED_TABLE', out.includes('UNAPPROVED_TABLE'), 'output: ' + out.slice(0, 300));
    assert('Contains HackedTable', out.includes('HackedTable'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 6: TABLE_COUNT_DIFF (prod 1 table, reh 2 tables)
function test6() {
  console.log('\nTest 6: TABLE_COUNT_DIFF');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCatalog = { "User": validTable(['id']) };
    var rehCatalog = { "User": validTable(['id']), "Account": validTable(['id']) };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(prodCatalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(rehCatalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains TABLE_COUNT_DIFF', out.includes('TABLE_COUNT_DIFF'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 7: DUPLICATE_CONSTRAINTS
function test7() {
  console.log('\nTest 7: DUPLICATE_CONSTRAINTS');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var dupCon = {
      columns: [validColumn('id', 1), validColumn('email', 2)],
      constraints: [
        { name: 'uq_email', type: 'u', definition: 'UNIQUE (email)' },
        { name: 'uq_email', type: 'u', definition: 'UNIQUE (email)' }
      ],
      indexes: []
    };
    var catalog = { "User": dupCon };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(catalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(catalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains DUPLICATE_CONSTRAINTS', out.includes('DUPLICATE_CONSTRAINTS'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 8: DUPLICATE_INDEXES
function test8() {
  console.log('\nTest 8: DUPLICATE_INDEXES');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var dupIdx = {
      columns: [validColumn('id', 1), validColumn('email', 2)],
      constraints: [],
      indexes: [
        { name: 'idx_email', definition: 'CREATE INDEX idx_email ON "User" (email)' },
        { name: 'idx_email', definition: 'CREATE INDEX idx_email ON "User" (email)' }
      ]
    };
    var catalog = { "User": dupIdx };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify(catalog, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify(catalog, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains DUPLICATE_INDEXES', out.includes('DUPLICATE_INDEXES'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 9: INDEX_MISSING_IN_REHEARSAL (one-sided index)
function test9() {
  console.log('\nTest 9: INDEX_MISSING_IN_REHEARSAL');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodTable = {
      columns: [validColumn('id', 1)],
      constraints: [],
      indexes: [{ name: 'idx_id', definition: 'CREATE INDEX idx_id ON "User" (id)' }]
    };
    var rehTable = {
      columns: [validColumn('id', 1)],
      constraints: [],
      indexes: []
    };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify({ "User": prodTable }, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify({ "User": rehTable }, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains INDEX_MISSING_IN_REHEARSAL', out.includes('INDEX_MISSING_IN_REHEARSAL'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 10: COLUMN_FORMATTED_TYPE_DIFF (both sides have it, different values)
function test10() {
  console.log('\nTest 10: COLUMN_FORMATTED_TYPE_DIFF');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCol = validColumn('id', 1);
    prodCol.formatted_type = 'integer';
    var rehCol = validColumn('id', 1);
    rehCol.formatted_type = 'bigint';
    var prodTable = { columns: [prodCol], constraints: [], indexes: [] };
    var rehTable = { columns: [rehCol], constraints: [], indexes: [] };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify({ "User": prodTable }, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify({ "User": rehTable }, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains COLUMN_FORMATTED_TYPE_DIFF', out.includes('COLUMN_FORMATTED_TYPE_DIFF'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 11: COLUMN_MISSING_IN_REHEARSAL
function test11() {
  console.log('\nTest 11: COLUMN_MISSING_IN_REHEARSAL');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodTable = { columns: [validColumn('id', 1), validColumn('email', 2)], constraints: [], indexes: [] };
    var rehTable = { columns: [validColumn('id', 1)], constraints: [], indexes: [] };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify({ "User": prodTable }, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify({ "User": rehTable }, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 1', result.status === 1, 'got ' + result.status);
    assert('Contains COLUMN_MISSING_IN_REHEARSAL', out.includes('COLUMN_MISSING_IN_REHEARSAL'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 12: METADATA_SIDE_GAP (formatted_type present on one side only - non-fatal warning)
function test12() {
  console.log('\nTest 12: METADATA_SIDE_GAP (one-sided metadata, non-fatal)');
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  try {
    var prodCol = validColumn('id', 1);
    var rehCol = validColumn('id', 1);
    delete rehCol.formatted_type;
    var prodTable = { columns: [prodCol], constraints: [], indexes: [] };
    var rehTable = { columns: [rehCol], constraints: [], indexes: [] };
    var prodPath = path.join(tmpDir, 'prod.json');
    var rehPath = path.join(tmpDir, 'reh.json');
    fs.writeFileSync(prodPath, JSON.stringify({ "User": prodTable }, null, 2));
    fs.writeFileSync(rehPath, JSON.stringify({ "User": rehTable }, null, 2));

    var result = runCompare(prodPath, rehPath);
    var out = norm(result.stdout);
    assert('Exit code 0 (side gap is non-fatal)', result.status === 0, 'got ' + result.status);
    assert('Contains METADATA_SIDE_GAP', out.includes('METADATA_SIDE_GAP'), 'output: ' + out.slice(0, 300));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('=== Catalog Validation Tests (Batch A closeout) ===');
test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8();
test9();
test10();
test11();
test12();

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) {
  process.exit(1);
}
