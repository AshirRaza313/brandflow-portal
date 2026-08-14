import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

describe.skipIf(!connectionString)("PostgreSQL RLS/grants", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("suppliers table exists in public schema", async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'suppliers'`
    );
    expect(result.rowCount).toBe(1);
  });

  it("anon role has no privileges on suppliers table", async () => {
    const result = await pool.query(
      `SELECT has_table_privilege('anon', 'public.suppliers', 'SELECT') AS has_select`
    );
    expect(result.rows[0].has_select).toBe(false);
  });

  it("authenticated role has no privileges on suppliers table", async () => {
    const result = await pool.query(
      `SELECT has_table_privilege('authenticated', 'public.suppliers', 'SELECT') AS has_select`
    );
    expect(result.rows[0].has_select).toBe(false);
  });
});
