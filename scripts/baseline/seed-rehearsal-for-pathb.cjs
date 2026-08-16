const { Pool } = require('pg');
const url = process.env.REHEARSAL_DATABASE_URL;
if (!url) { console.error('REHEARSAL_DATABASE_URL not set'); process.exit(1); }
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
(async () => {
  const org = await pool.query(`INSERT INTO "public"."Organization" ("id","name","slug","email","createdAt","updatedAt") VALUES ('org-pathb','PathB Org','pathb-org','pathb@example.com',NOW(),NOW()) RETURNING id`);
  const orgId = org.rows[0].id;
  await pool.query(`INSERT INTO "public"."User" ("id","name","email","role","createdAt","updatedAt") VALUES ('user-pathb','PathB User','user-pathb@example.com','brand_owner',NOW(),NOW())`);
  await pool.query(`INSERT INTO "public"."OrganizationMember" ("id","organizationId","userId","role","joinedAt") VALUES ('member-pathb',$1,'user-pathb','brand_owner',NOW())`, [orgId]);
  await pool.query(`INSERT INTO "public"."suppliers" ("id","organization_id","name","status","rating","created_at","updated_at") VALUES ('sup-pathb',$1,'PathB Supplier','active',4,NOW(),NOW())`, [orgId]);
  console.log('Seed rows inserted');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });