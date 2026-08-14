import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

describe.skipIf(!connectionString)("PostgreSQL supplier constraints", () => {
  let pool: Pool;
  let orgId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const org = await pool.query(
      `INSERT INTO "public"."Organization" ("id", "name", "slug", "email", "updatedAt")
       VALUES (gen_random_uuid()::text, 'Integration Test Org', $1, 'it@example.com', NOW())
       RETURNING "id"`,
      [`integration-test-org-${uniqueSuffix}`]
    );
    orgId = org.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM "public"."suppliers" WHERE "organization_id" = $1`, [orgId]);
    await pool.query(`DELETE FROM "public"."Organization" WHERE "id" = $1`, [orgId]);
    await pool.end();
  });

  it("rejects rating below 1", async () => {
    await expect(
      pool.query(
        `INSERT INTO "public"."suppliers" ("id", "organization_id", "name", "rating")
         VALUES (gen_random_uuid()::text, $1, 'Invalid Rating Supplier', 0)`,
        [orgId]
      )
    ).rejects.toThrow(/suppliers_rating_check|violates check constraint/);
  });

  it("rejects rating above 5", async () => {
    await expect(
      pool.query(
        `INSERT INTO "public"."suppliers" ("id", "organization_id", "name", "rating")
         VALUES (gen_random_uuid()::text, $1, 'Invalid Rating Supplier', 6)`,
        [orgId]
      )
    ).rejects.toThrow(/suppliers_rating_check|violates check constraint/);
  });

  it("rejects invalid status", async () => {
    await expect(
      pool.query(
        `INSERT INTO "public"."suppliers" ("id", "organization_id", "name", "status")
         VALUES (gen_random_uuid()::text, $1, 'Invalid Status Supplier', 'paused')`,
        [orgId]
      )
    ).rejects.toThrow(/suppliers_status_check|violates check constraint/);
  });

  it("accepts valid supplier", async () => {
    const result = await pool.query(
      `INSERT INTO "public"."suppliers" ("id", "organization_id", "name", "rating", "status")
       VALUES (gen_random_uuid()::text, $1, 'Valid Supplier', 5, 'active')
       RETURNING "id"`,
      [orgId]
    );
    expect(result.rows[0].id).toBeDefined();
  });
});
