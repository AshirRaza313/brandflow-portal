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

  function insertSupplier(name: string, rating: number | null, status: string) {
    return pool.query(
      `INSERT INTO "public"."suppliers" ("id", "organization_id", "name", "rating", "status", "created_at", "updated_at")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
       RETURNING "id"`,
      [orgId, name, rating, status]
    );
  }

  it("rejects rating below 1", async () => {
    await expect(insertSupplier("Invalid Rating Supplier", 0, "active"))
      .rejects.toThrow(/suppliers_rating_check|violates check constraint/);
  });

  it("rejects rating above 5", async () => {
    await expect(insertSupplier("Invalid Rating Supplier", 6, "active"))
      .rejects.toThrow(/suppliers_rating_check|violates check constraint/);
  });

  it("rejects invalid status", async () => {
    await expect(insertSupplier("Invalid Status Supplier", null, "paused"))
      .rejects.toThrow(/suppliers_status_check|violates check constraint/);
  });

  it("accepts valid supplier", async () => {
    const result = await insertSupplier("Valid Supplier", 5, "active");
    expect(result.rows[0].id).toBeDefined();
  });
});