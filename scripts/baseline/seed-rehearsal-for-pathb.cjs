"use strict";

const { Pool } = require("pg");
const { assertConnectedIdentity, validateRehearsalUrl } = require("./safety-guard.cjs");
const { strictSupabaseTls } = require("./supabase-tls.cjs");

async function main() {
  const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
  const pool = new Pool({
    connectionString: process.env.REHEARSAL_DATABASE_URL,
    ssl: strictSupabaseTls(process.env.REHEARSAL_DATABASE_URL, parsed.isLocal),
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  try {
    await assertConnectedIdentity(client, parsed);
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public."Organization"
        ("id", "name", "slug", "email", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ["org-pathb", "Path B Organization", "path-b-organization", "path-b-org@example.invalid"]
    );
    await client.query(
      `INSERT INTO public."User"
        ("id", "name", "email", "role", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ["user-pathb", "Path B User", "path-b-user@example.invalid", "brand_owner"]
    );
    await client.query(
      `INSERT INTO public."OrganizationMember"
        ("id", "organizationId", "userId", "role", "joinedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      ["member-pathb", "org-pathb", "user-pathb", "brand_owner"]
    );
    await client.query(
      `INSERT INTO public.suppliers
        ("id", "organization_id", "name", "status", "rating", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      ["supplier-pathb", "org-pathb", "Path B Supplier", "active", 4]
    );

    const proof = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM public."Organization" o
      JOIN public."OrganizationMember" m ON m."organizationId" = o.id
      JOIN public."User" u ON u.id = m."userId"
      JOIN public.suppliers s ON s.organization_id = o.id
      WHERE o.id = 'org-pathb'
        AND m.id = 'member-pathb'
        AND u.id = 'user-pathb'
        AND s.id = 'supplier-pathb'
    `);
    if (proof.rows[0].count !== 1) {
      throw new Error("Seed verification failed: FK-valid graph was not created");
    }
    await client.query("COMMIT");
    console.log("Path-B seed committed: Organization -> User/Member -> Supplier graph");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
