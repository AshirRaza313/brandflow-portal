// scripts/baseline/replay-baseline.cjs
// Replays the immutable baseline migration on a rehearsal database.
// Safety guard: rejects production, validates CI credentials, enforces staging allowlist.

var fs = require("fs");
var Pool = require("pg").Pool;
var validateRehearsalUrl = require("./safety-guard.cjs").validateRehearsalUrl;

var parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
var connectionString = process.env.REHEARSAL_DATABASE_URL;

var sql = fs.readFileSync(
  "prisma/migrations/20260101000000_baseline/migration.sql",
  "utf8"
);

var pool = new Pool({
  connectionString: connectionString,
  ssl: parsed.isLocal ? undefined : { rejectUnauthorized: false },
});

(async function () {
  await pool.query(sql);
  var tables = await pool.query(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'"
  );
  console.log("Tables after baseline replay:", tables.rows[0].count);
  await pool.end();
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
