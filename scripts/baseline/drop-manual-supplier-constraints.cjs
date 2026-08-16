// scripts/baseline/drop-manual-supplier-constraints.cjs
// Drops manual CHECK constraints from suppliers table in rehearsal DB.
// These constraints do not exist in production (pre-PR6 state).
// Safety guard: rejects production, validates CI credentials, enforces staging allowlist.

var Pool = require("pg").Pool;
var validateRehearsalUrl = require("./safety-guard.cjs").validateRehearsalUrl;

var parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
var connectionString = process.env.REHEARSAL_DATABASE_URL;

var pool = new Pool({
  connectionString: connectionString,
  ssl: parsed.isLocal ? undefined : { rejectUnauthorized: false },
});

(async () => {
  await pool.query(
    `ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_rating_check"`
  );
  await pool.query(
    `ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_status_check"`
  );
  console.log("Dropped manual supplier CHECK constraints from rehearsal DB");
  await pool.end();
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});