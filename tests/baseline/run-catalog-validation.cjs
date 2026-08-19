// tests/baseline/catalog-validation.test.cjs
// Regression tests for compare-catalogs.cjs - Batch A / 5R5

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
    REH_CATALOG: rehPath
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

console.log('=== Catalog Validation Tests (5R5) ===');
test1();
test2();
test3();
test4();

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) {
  process.exit(1);
}
