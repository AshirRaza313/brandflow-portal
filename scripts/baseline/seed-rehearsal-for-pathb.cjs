// scripts/baseline/seed-rehearsal-for-pathb.cjs
// Seeds representative rows into rehearsal DB for Path B testing.
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
  var org = await pool.query(
    `INSERT INTO "public"."Organization" ("id","name","slug","email","createdAt","updatedAt") VALUES ('org-pathb','PathB Org','pathb-org','pathb@example.com',NOW(),NOW()) RETURNING id`
  );
  var orgId = org.rows[0].id;
  await pool.query(
    `INSERT INTO "public"."User" ("id","name","email","role","createdAt","updatedAt") VALUES ('user-pathb','PathB User','user-pathb@example.com','brand_owner',NOW(),NOW())`
  );
  await pool.query(
    `INSERT INTO "public"."OrganizationMember" ("id","organizationId","userId","role","joinedAt") VALUES ('member-pathb',$1,'user-pathb','brand_owner',NOW())`,
    [orgId]
  );
  await pool.query(
    `INSERT INTO "public"."suppliers" ("id","organization_id","name","status","rating","created_at","updated_at") VALUES ('sup-pathb',$1,'PathB Supplier','active',4,NOW(),NOW())`,
    [orgId]
  );
  console.log("Seed rows inserted: 1 Organization, 1 User, 1 OrganizationMember, 1 Supplier");
  await pool.end();
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});