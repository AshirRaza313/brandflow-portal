const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { Client } = require("pg");

const EXPECTED_DATABASE = "supplier_migration_test";
const EXPECTED_MIGRATION =
  "20260815_add_supplier_constraints_and_security";
const migrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  EXPECTED_MIGRATION,
  "migration.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

function requireSafeCiDatabase(rawUrl) {
  if (process.env.CI !== "true" || process.env.GITHUB_ACTIONS !== "true") {
    throw new Error(
      "Supplier migration integration test is restricted to GitHub Actions CI.",
    );
  }

  if (
    process.env.GITHUB_REPOSITORY !== "AshirRaza313/valtriox" ||
    process.env.RUNNER_ENVIRONMENT !== "github-hosted"
  ) {
    throw new Error(
      "Supplier migration integration test requires the trusted GitHub-hosted repository runner.",
    );
  }

  if (!rawUrl) {
    throw new Error("SUPPLIER_MIGRATION_TEST_DATABASE_URL is required.");
  }

  const parsed = new URL(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const port = parsed.port;

  if (
    parsed.protocol !== "postgresql:" ||
    hostname !== "localhost" ||
    port !== "5432" ||
    database !== EXPECTED_DATABASE ||
    decodeURIComponent(parsed.username) !== "postgres" ||
    parsed.search !== ""
  ) {
    throw new Error(
      "Unsafe integration target. Expected postgres on CI localhost:5432/" +
        EXPECTED_DATABASE +
        ".",
    );
  }

  const username = encodeURIComponent(decodeURIComponent(parsed.username));
  const password = encodeURIComponent(decodeURIComponent(parsed.password));
  return `postgresql://${username}:${password}@localhost:5432/${EXPECTED_DATABASE}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectSqlState(operation, expectedCode, label) {
  try {
    await operation();
  } catch (error) {
    assert(
      error && error.code === expectedCode,
      `${label}: expected SQLSTATE ${expectedCode}, received ${error?.code || "none"}`,
    );
    return;
  }
  throw new Error(`${label}: operation unexpectedly succeeded`);
}

async function ensureDataApiRoles(client) {
  await client.query(`
    DO $roles$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END
    $roles$;
  `);
}

async function resetFixture(client, options = {}) {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.query("RESET ROLE").catch(() => undefined);
  await client.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public AUTHORIZATION postgres;
    GRANT USAGE ON SCHEMA public TO PUBLIC;

    CREATE TABLE public.suppliers (
      id text NOT NULL PRIMARY KEY,
      organization_id text NOT NULL,
      name text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      rating integer,
      created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    GRANT SELECT ON TABLE public.suppliers TO PUBLIC;
    GRANT INSERT, UPDATE ON TABLE public.suppliers TO anon;
    GRANT SELECT, DELETE ON TABLE public.suppliers TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suppliers TO service_role;
    GRANT REFERENCES (id) ON TABLE public.suppliers TO PUBLIC;
    GRANT SELECT (name) ON TABLE public.suppliers TO anon;
    GRANT UPDATE (status) ON TABLE public.suppliers TO authenticated;
    GRANT REFERENCES (organization_id) ON TABLE public.suppliers TO service_role;
  `);

  const serverVersion = await client.query(
    "SELECT current_setting('server_version_num')::integer AS version_num",
  );
  if (serverVersion.rows[0].version_num >= 170000) {
    await client.query(
      "GRANT MAINTAIN ON TABLE public.suppliers TO service_role",
    );
  }

  const rating = options.invalidRating ? 0 : 5;
  const status = options.invalidStatus ? "paused" : "active";
  await client.query(
    `INSERT INTO public.suppliers
       (id, organization_id, name, status, rating)
     VALUES ($1, $2, $3, $4, $5)`,
    ["supplier-fixture", "org-fixture", "Fixture Supplier", status, rating],
  );

  if (options.enableRls) {
    await client.query("ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY");
  }
}

async function assertMigrationSuccess(client) {
  const constraints = await client.query(`
    SELECT conname, convalidated
    FROM pg_constraint
    WHERE conrelid = 'public.suppliers'::regclass
      AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
    ORDER BY conname
  `);
  assert(constraints.rowCount === 2, "both Supplier constraints must exist");
  assert(
    constraints.rows.every((row) => row.convalidated === true),
    "both Supplier constraints must be validated",
  );

  const posture = await client.query(`
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.suppliers'::regclass
  `);
  assert(
    posture.rows[0]?.relrowsecurity === false,
    "forward migration must leave RLS disabled pending runtime-role proof",
  );

  const serverVersion = await client.query(
    "SELECT current_setting('server_version_num')::integer AS version_num",
  );
  const tablePrivileges = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ];
  if (serverVersion.rows[0].version_num >= 170000) {
    tablePrivileges.push("MAINTAIN");
  }

  const privilegeRows = await client.query(
    `
      SELECT role_name, privilege_name,
             has_table_privilege(role_name, 'public.suppliers', privilege_name) AS allowed
      FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role_name)
      CROSS JOIN unnest($1::text[]) AS privileges(privilege_name)
    `,
    [tablePrivileges],
  );
  assert(
    privilegeRows.rows.every((row) => row.allowed === false),
    "anon/authenticated/service_role must have no effective table privilege",
  );

  const columnPrivilegeRows = await client.query(`
    SELECT role_name, column_name, privilege_name,
           has_column_privilege(
             role_name,
             'public.suppliers',
             column_name,
             privilege_name
           ) AS allowed
    FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role_name)
    CROSS JOIN (
      SELECT attname AS column_name
      FROM pg_attribute
      WHERE attrelid = 'public.suppliers'::regclass
        AND attnum > 0
        AND NOT attisdropped
    ) AS columns
    CROSS JOIN (
      VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
    ) AS privileges(privilege_name)
  `);
  assert(
    columnPrivilegeRows.rows.every((row) => row.allowed === false),
    "anon/authenticated/service_role must have no effective column privilege",
  );

  await client.query("SET ROLE anon");
  await expectSqlState(
    () => client.query("SELECT * FROM public.suppliers"),
    "42501",
    "anon SELECT denial",
  );
  await client.query("RESET ROLE");

  await client.query("SET ROLE service_role");
  await expectSqlState(
    () => client.query("SELECT * FROM public.suppliers"),
    "42501",
    "service_role SELECT denial",
  );
  await client.query("RESET ROLE");

  await client.query("SET ROLE authenticated");
  await expectSqlState(
    () => client.query("DELETE FROM public.suppliers"),
    "42501",
    "authenticated DELETE denial",
  );
  await client.query("RESET ROLE");

  await client.query(`
    INSERT INTO public.suppliers
      (id, organization_id, name, status, rating)
    VALUES ('supplier-valid', 'org-fixture', 'Valid Supplier', 'inactive', NULL)
  `);
  await client.query(`
    UPDATE public.suppliers
    SET status = 'blacklisted', rating = 1
    WHERE id = 'supplier-valid'
  `);
  await client.query("DELETE FROM public.suppliers WHERE id = 'supplier-valid'");

  await expectSqlState(
    () =>
      client.query(`
        INSERT INTO public.suppliers
          (id, organization_id, name, status, rating)
        VALUES ('supplier-bad-rating', 'org-fixture', 'Bad', 'active', 6)
      `),
    "23514",
    "rating constraint",
  );
  await expectSqlState(
    () =>
      client.query(`
        INSERT INTO public.suppliers
          (id, organization_id, name, status, rating)
        VALUES ('supplier-bad-status', 'org-fixture', 'Bad', 'paused', 3)
      `),
    "23514",
    "status constraint",
  );
}

async function assertPreflightRollback(client, fixtureOptions, label) {
  await resetFixture(client, fixtureOptions);
  await expectSqlState(
    () => client.query(migrationSql),
    fixtureOptions.enableRls ? "55000" : "23514",
    label,
  );
  await client.query("ROLLBACK").catch(() => undefined);

  const constraintCount = await client.query(`
    SELECT count(*)::integer AS count
    FROM pg_constraint
    WHERE conrelid = 'public.suppliers'::regclass
      AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
  `);
  assert(
    constraintCount.rows[0].count === 0,
    `${label}: failed migration must not leave constraints behind`,
  );

  const originalGrant = await client.query(
    "SELECT has_table_privilege('anon', 'public.suppliers', 'INSERT') AS allowed",
  );
  assert(
    originalGrant.rows[0].allowed === true,
    `${label}: failed migration must roll privilege changes back`,
  );
}

async function assertMissingTablePreflight(client) {
  await resetFixture(client);
  await client.query("DROP TABLE public.suppliers");
  await expectSqlState(
    () => client.query(migrationSql),
    "42P01",
    "missing-table preflight",
  );
  await client.query("ROLLBACK").catch(() => undefined);

  const table = await client.query(
    "SELECT to_regclass('public.suppliers') AS supplier_table",
  );
  assert(
    table.rows[0].supplier_table === null,
    "missing-table preflight must not create a Supplier table",
  );
}

async function assertPostflightRollback(client) {
  await resetFixture(client);
  await client.query(`
    DO $role$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'supplier_test_inherited'
      ) THEN
        CREATE ROLE supplier_test_inherited NOLOGIN;
      END IF;
    END
    $role$;
    GRANT supplier_test_inherited TO anon;
    GRANT SELECT ON TABLE public.suppliers TO supplier_test_inherited;
  `);

  await expectSqlState(
    () => client.query(migrationSql),
    "42501",
    "inherited-privilege postflight",
  );
  await client.query("ROLLBACK").catch(() => undefined);

  const state = await client.query(`
    SELECT
      (
        SELECT count(*)::integer
        FROM pg_constraint
        WHERE conrelid = 'public.suppliers'::regclass
          AND conname IN ('suppliers_rating_check', 'suppliers_status_check')
      ) AS constraint_count,
      has_table_privilege('anon', 'public.suppliers', 'INSERT') AS original_insert,
      has_table_privilege('anon', 'public.suppliers', 'SELECT') AS inherited_select
  `);
  assert(
    state.rows[0].constraint_count === 0,
    "postflight failure must roll constraint DDL back",
  );
  assert(
    state.rows[0].original_insert === true &&
      state.rows[0].inherited_select === true,
    "postflight failure must roll privilege revokes back",
  );
}

async function main() {
  const connectionString = requireSafeCiDatabase(
    process.env.SUPPLIER_MIGRATION_TEST_DATABASE_URL,
  );
  const client = new Client({ connectionString, ssl: false });

  await client.connect();
  try {
    const identity = await client.query(`
      SELECT current_user, current_database(), version() AS postgres_version
    `);
    assert(identity.rows[0]?.current_user === "postgres", "unexpected CI DB role");
    assert(
      identity.rows[0]?.current_database === EXPECTED_DATABASE,
      "unexpected CI database",
    );
    assert(
      identity.rows[0]?.postgres_version?.startsWith("PostgreSQL "),
      "unexpected CI database server",
    );

    await ensureDataApiRoles(client);

    await resetFixture(client);
    await client.query(migrationSql);
    await assertMigrationSuccess(client);

    await assertPreflightRollback(
      client,
      { invalidRating: true },
      "invalid-rating preflight",
    );
    await assertPreflightRollback(
      client,
      { invalidStatus: true },
      "invalid-status preflight",
    );
    await assertPreflightRollback(
      client,
      { enableRls: true },
      "unexpected-RLS preflight",
    );
    await assertMissingTablePreflight(client);
    await assertPostflightRollback(client);

    console.log(
      `PASS: ${EXPECTED_MIGRATION} constraints, grants, owner CRUD, preflights, and transactional rollback`,
    );
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.query("RESET ROLE").catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
