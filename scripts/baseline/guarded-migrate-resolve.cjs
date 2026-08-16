// scripts/baseline/guarded-migrate-resolve.cjs
// Guarded wrapper for: prisma migrate resolve --applied <migration>
// Validates REHEARSAL_DATABASE_URL, proves exact target, captures
// before/after row counts and migrate status.
// NEVER run against production. Only disposable rehearsal databases.

var { execSync } = require("child_process");
var fs = require("fs");
var Pool = require("pg").Pool;
var validateRehearsalUrl = require("./safety-guard.cjs").validateRehearsalUrl;

// Parse and validate rehearsal URL
var parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
var connectionString = process.env.REHEARSAL_DATABASE_URL;
var migrationName = process.argv[2];

if (!migrationName) {
  console.error("Usage: node scripts/baseline/guarded-migrate-resolve.cjs <migration_name>");
  console.error("Example: node scripts/baseline/guarded-migrate-resolve.cjs 20260101000000_baseline");
  process.exit(1);
}

console.log("=== Guarded Migrate Resolve ===");
console.log("Target host:", parsed.host);
console.log("Target port:", parsed.port);
console.log("Target dbname:", parsed.dbname);
console.log("Migration:", migrationName);
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
    migration: migrationName,
    counts: counts
  };
  var filename = "backups/" + label + "-row-counts.json";
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(label + " row counts saved to", filename, "(" + counts.length + " tables)");
  return data;
}

(async () => {
  try {
    // Step 1: Before row counts
    var before = await captureRowCounts("before-resolve");

    // Step 2: Migrate status before
    console.log("\n--- Migrate Status BEFORE ---");
    try {
      var statusBefore = execSync("npx prisma migrate status --schema prisma/schema.prisma", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      console.log(statusBefore);
    } catch (e) {
      console.log("Migrate status output (may show 'not up to date'):");
      console.log(e.stdout || e.message);
    }

    // Step 3: Execute prisma migrate resolve
    console.log("\n--- Executing: prisma migrate resolve --applied " + migrationName + " ---");
    try {
      var resolveOutput = execSync(
        "npx prisma migrate resolve --schema prisma/schema.prisma --applied " + migrationName,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      console.log(resolveOutput);
    } catch (e) {
      console.error("Migrate resolve failed:");
      console.error(e.stderr || e.message);
      process.exit(1);
    }

    // Step 4: Migrate status after
    console.log("\n--- Migrate Status AFTER ---");
    try {
      var statusAfter = execSync("npx prisma migrate status --schema prisma/schema.prisma", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      console.log(statusAfter);
    } catch (e) {
      console.log("Migrate status output:");
      console.log(e.stdout || e.message);
    }

    // Step 5: After row counts
    var after = await captureRowCounts("after-resolve");

    // Step 6: Compare before/after
    console.log("\n=== Before/After Row Count Comparison ===");
    var deltaFound = false;
    var allTables = new Set([...before.counts.map(function (c) { return c.table; }), ...after.counts.map(function (c) { return c.table; })]);
    var allTablesArr = Array.from(allTables).sort();
    for (var t = 0; t < allTablesArr.length; t++) {
      var tbl = allTablesArr[t];
      var b = before.counts.find(function (c) { return c.table === tbl; });
      var a = after.counts.find(function (c) { return c.table === tbl; });
      var bCount = b ? b.rows : -1;
      var aCount = a ? a.rows : -1;
      if (bCount !== aCount) {
        console.log("DELTA: " + tbl + " before=" + bCount + " after=" + aCount);
        deltaFound = true;
      }
    }

    // _prisma_migrations delta is expected (new table created by resolve)
    var prismaDelta = after.counts.find(function (c) { return c.table === "_prisma_migrations"; });
    if (prismaDelta && prismaDelta.rows > 0) {
      console.log("EXPECTED: _prisma_migrations has " + prismaDelta.rows + " row(s) (created by resolve)");
    }

    // Only fail on unexpected deltas (non-_prisma_migrations changes)
    var unexpectedDeltas = false;
    for (var t2 = 0; t2 < allTablesArr.length; t2++) {
      var tbl2 = allTablesArr[t2];
      if (tbl2 === "_prisma_migrations") continue;
      var b2 = before.counts.find(function (c) { return c.table === tbl2; });
      var a2 = after.counts.find(function (c) { return c.table === tbl2; });
      var bC = b2 ? b2.rows : -1;
      var aC = a2 ? a2.rows : -1;
      if (bC !== aC) {
        console.error("UNEXPECTED DELTA: " + tbl2 + " before=" + bC + " after=" + aC + " (data loss detected)");
        unexpectedDeltas = true;
      }
    }

    if (unexpectedDeltas) {
      console.error("\nFAILED: Unexpected row count changes detected. Review before/after files.");
      process.exit(1);
    } else {
      console.log("\nSUCCESS: No unexpected row count changes. Only _prisma_migrations delta is expected.");
    }

    await pool.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();