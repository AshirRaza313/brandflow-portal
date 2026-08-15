import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

describe.skipIf(!connectionString)("PostgreSQL baseline schema", () => {
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

  it("Organization table exists", async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='Organization'`
    );
    expect(result.rowCount).toBe(1);
  });

  it("ValtrioxTeamMember table exists", async () => {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='ValtrioxTeamMember'`
    );
    expect(result.rowCount).toBe(1);
  });
});