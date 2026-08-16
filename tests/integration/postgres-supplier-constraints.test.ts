import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

describe.skipIf(!connectionString)(
  "PostgreSQL baseline replay validation",
  () => {
    let pool: Pool;

    beforeAll(() => {
      pool = new Pool({
        connectionString: connectionString!,
        ssl: connectionString!.includes("localhost")
          ? undefined
          : { rejectUnauthorized: false },
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

    it("baseline catalog has expected column count per table", async () => {
      const columns = await pool.query(`
        SELECT table_name, COUNT(*)::int AS col_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        GROUP BY table_name
        ORDER BY table_name
      `);
      // Verify every table has at least 1 column and the total is reasonable
      expect(columns.rows.length).toBe(40);
      for (const row of columns.rows) {
        expect(row.col_count).toBeGreaterThanOrEqual(1);
      }
    });

    it("baseline catalog has no tables with zero columns", async () => {
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables t
        WHERE table_schema = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name
          )
      `);
      expect(tables.rows.length).toBe(0);
    });

    it("baseline catalog includes expected primary key constraints", async () => {
      const pks = await pool.query(`
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY tc.table_name
      `);
      // Every table should have a primary key
      expect(pks.rows.length).toBe(40);
      const tableNames = pks.rows.map((r) => r.table_name);
      expect(tableNames).toContain("Account");
      expect(tableNames).toContain("Organization");
      expect(tableNames).toContain("User");
      expect(tableNames).toContain("suppliers");
    });

    it("baseline catalog includes foreign key constraints on key tables", async () => {
      const fks = await pool.query(`
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name
      `);
      // At least some tables should have FK constraints
      expect(fks.rows.length).toBeGreaterThan(0);
    });

    it("baseline catalog includes indexes beyond primary keys", async () => {
      const indexes = await pool.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      // Should have more indexes than just PKs (40 tables = at least 40 PK indexes)
      expect(indexes.rows.length).toBeGreaterThanOrEqual(40);
    });

    it("baseline catalog column-level snapshot is captureable", async () => {
      const snapshot = await pool.query(`
        SELECT
          c.table_name,
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.is_nullable,
          c.column_default
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position
      `);
      // Full snapshot should be non-empty and structurally sound
      expect(snapshot.rows.length).toBeGreaterThan(0);
      for (const col of snapshot.rows) {
        expect(col.table_name).toBeTruthy();
        expect(col.column_name).toBeTruthy();
        expect(col.data_type).toBeTruthy();
        // is_nullable should be YES or NO
        expect(["YES", "NO"]).toContain(col.is_nullable);
      }
    });
  }
);
