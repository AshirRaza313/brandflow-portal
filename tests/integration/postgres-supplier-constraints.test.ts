import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

describe.skipIf(!connectionString)("PostgreSQL baseline replay validation", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("baseline replay creates exactly 40 public tables", async () => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public'`
    );
    expect(result.rows[0].count).toBe(40);
  });

  it("suppliers table exists", async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers'`
    );
    expect(result.rowCount).toBe(1);
  });
});