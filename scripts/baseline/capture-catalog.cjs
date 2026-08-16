// scripts/baseline/capture-catalog.cjs
// Captures table catalog and roles from a rehearsal database.
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

(async function () {
  var tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  var roles = await pool.query(
    "SELECT rolname FROM pg_roles ORDER BY rolname"
  );
  fs.writeFileSync(
    "backups/catalog-tables.json",
    JSON.stringify(tables.rows, null, 2)
  );
  fs.writeFileSync(
    "backups/roles.json",
    JSON.stringify(roles.rows, null, 2)
  );
  console.log("Catalog and roles captured successfully");
  await pool.end();
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
