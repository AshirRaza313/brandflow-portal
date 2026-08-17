// scripts/baseline/guarded-migrate-resolve.cjs
// Guarded wrapper for: prisma migrate resolve --applied <migration>
// Validates REHEARSAL_DATABASE_URL, binds DATABASE_URL and DIRECT_DATABASE_URL
// to the same validated URL, enforces migration name allowlist, uses
// argument-based execution (no shell), captures before/after row counts.
// NEVER run against production. Only disposable rehearsal databases.

var execFileSync = require("child_process").execFileSync;
var fs = require("fs");
var Pool = require("pg").Pool;
var validateRehearsalUrl = require("./safety-guard.cjs").validateRehearsalUrl;

// Parse and validate rehearsal URL
var parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
var connectionString = process.env.REHEARSAL_DATABASE_URL;

// CRITICAL: Bind Prisma environment variables to validated rehearsal URL.
// Prevents mismatch where wrapper validates one DB but Prisma targets another.
process.env.DATABASE_URL = connectionString;
process.env.DIRECT_DATABASE_URL = connectionString;

var migrationName = process.argv[2];

if (!migrationName) {
  console.error("Usage: node scripts/baseline/guarded-migrate-resolve.cjs <migration_name>");
  console.error("Example: node scripts/baseline/guarded-migrate-resolve.cjs 20260101000000_baseline");
  process.exit(1);
}

// Migration name allowlist - only known safe migrations allowed.
// Prevents arbitrary migration name injection.
var ALLOWED_MIGRATIONS = [
  "20260101000000_baseline"
];
if (ALLOWED_MIGRATIONS.indexOf(migrationName) === -1) {
  console.error("ERROR: Migration name not in allowlist. Allowed: " + ALLOWED_MIGRATIONS.join(", "));
  process.exit(1);
}

console.log("=== Guarded Migrate Resolve ===");
console.log("Target host:", parsed.host);
console.log("Target port:", parsed.port);
console.log("Target dbname:", parsed.dbname);
console.log("Migration:", migrationName);
console.log("DATABASE_URL bound to validated rehearsal URL");
console.log("DIRECT_DATABASE_URL bound to validated rehearsal URL");
console.log("Is local:", parsed.isLocal);

var pool = new Pool({
  connectionString: connectionString,
  ssl: parsed.isLocal ? undefined : { rejectUnauthorized: false },
});

async function captureRowCounts(label) {
  var tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  );
  var counts = [];
  for (var i = 0; i < tables.rows.length; i++) {
    var name = tables.rows[i].table_name;
    var result = await pool.query('SELECT COUNT(*)::int AS count FROM "public"."' + name + '"');
    counts.push({ table: name, rows: result.rows[0].count });
  }
  var data = {
    label: label,
    capturedAt: new Date().toISOString(),
    targetHost: parsed.host,
    targetDbname: parsed.dbname,
    migration: migrationName,
    counts: counts
  };
  var filename = "backups/" + label + "-row-counts.json";
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(label + " row counts saved to", filename, "(" + counts.length + " tables)");
  return data;
}

async function main() {
  // Step 1: Before row counts
  var before = await captureRowCounts("before-resolve");

  // Step 2: Migrate status before (exit code 1 = pending migrations is expected for Path B)
  console.log("\n--- Migrate Status BEFORE ---");
  try {
    execFileSync("npx", ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"], { stdio: "inherit" });
  } catch (e) {
    if (e.status === 1) {
      console.log("(Exit code 1: pending migrations - expected for Path B)");
    } else {
      console.error("Migrate status failed with exit code:", e.status);
      process.exit(1);
    }
  }

  // Step 3: Execute prisma migrate resolve (argument-based, no shell injection risk)
  console.log("\n--- Executing: prisma migrate resolve --applied " + migrationName + " ---");
  try {
    execFileSync("npx", ["prisma", "migrate", "resolve", "--schema", "prisma/schema.prisma", "--applied", migrationName], { stdio: "inherit" });
  } catch (e) {
    console.error("Migrate resolve failed with exit code:", e.status);
    process.exit(1);
  }

  // Step 4: Migrate status after (must be exit code 0 = up to date)
  console.log("\n--- Migrate Status AFTER ---");
  try {
    execFileSync("npx", ["prisma", "migrate", "status", "--schema", "prisma/schema.prisma"], { stdio: "inherit" });
  } catch (e) {
    console.error("Migrate status after resolve failed with exit code:", e.status);
    console.error("Expected up to date after successful resolve.");
    process.exit(1);
  }

  // Step 5: After row counts
  var after = await captureRowCounts("after-resolve");

  // Step 6: Compare before/after
  console.log("\n=== Before/After Row Count Comparison ===");
  var unexpectedDeltas = false;
  var allTables = new Set([].concat(
    before.counts.map(function(c) { return c.table; }),
    after.counts.map(function(c) { return c.table; })
  ));
  var allTablesArr = Array.from(allTables).sort();
  for (var t = 0; t < allTablesArr.length; t++) {
    var tbl = allTablesArr[t];
    if (tbl === "_prisma_migrations") continue;
    var b = before.counts.find(function(c) { return c.table === tbl; });
    var a = after.counts.find(function(c) { return c.table === tbl; });
    var bC = b ? b.rows : -1;
    var aC = a ? a.rows : -1;
    if (bC !== aC) {
      console.error("UNEXPECTED DELTA: " + tbl + " before=" + bC + " after=" + aC + " (data loss detected)");
      unexpectedDeltas = true;
    }
  }
  var prismaDelta = after.counts.find(function(c) { return c.table === "_prisma_migrations"; });
  if (prismaDelta && prismaDelta.rows > 0) {
    console.log("EXPECTED: _prisma_migrations has " + prismaDelta.rows + " row(s) (created by resolve)");
  }

  if (unexpectedDeltas) {
    console.error("\nFAILED: Unexpected row count changes detected. Review before/after files.");
    process.exit(1);
  } else {
    console.log("\nSUCCESS: No unexpected row count changes.");
  }

  await pool.end();
}

main().catch(function(e) {
  console.error(e);
  process.exit(1);
});