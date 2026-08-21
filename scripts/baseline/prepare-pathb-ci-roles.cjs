"use strict";

const { Pool } = require("pg");
const {
  assertConnectedIdentity,
  validateRehearsalUrl,
} = require("./safety-guard.cjs");
const { strictSupabaseTls } = require("./supabase-tls.cjs");

async function main() {
  const parsed = validateRehearsalUrl("REHEARSAL_DATABASE_URL");
  if (
    !parsed.isLocal ||
    process.env.CI !== "true" ||
    process.env.GITHUB_ACTIONS !== "true"
  ) {
    throw new Error("Path-B role fixture is allowed only on the exact GitHub CI localhost target");
  }

  const connectionString = process.env.REHEARSAL_DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: strictSupabaseTls(connectionString, true),
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();
  try {
    await assertConnectedIdentity(client, parsed);
    await client.query("BEGIN");
    await client.query(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN;

      GRANT SELECT, INSERT, UPDATE, DELETE
        ON TABLE public.suppliers
        TO anon, authenticated, service_role;
      GRANT SELECT (name), UPDATE (rating)
        ON TABLE public.suppliers
        TO anon, authenticated, service_role;
    `);
    const proof = await client.query(`
      SELECT role.rolname
      FROM pg_catalog.pg_roles AS role
      WHERE role.rolname IN ('anon', 'authenticated', 'service_role')
        AND role.rolcanlogin = false
        AND pg_catalog.has_table_privilege(
          role.rolname,
          'public.suppliers'::regclass,
          'SELECT'
        )
        AND pg_catalog.has_column_privilege(
          role.rolname,
          'public.suppliers'::regclass,
          'rating',
          'UPDATE'
        )
      ORDER BY role.rolname
    `);
    if (proof.rows.length !== 3) {
      throw new Error("Path-B role fixture did not create all three seeded privilege grants");
    }
    await client.query("COMMIT");
    console.log("Path-B CI roles created with table and column privileges for revoke proof");
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
