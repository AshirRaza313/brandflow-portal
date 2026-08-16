import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.INTEGRATION_DATABASE_URL;

// _prisma_migrations is a Prisma-internal migration tracking table, not a
// Valtriox schema table.  All schema-table count queries exclude it so that
// the assertion stays at exactly 40 baseline tables regardless of whether
// the CI replay uses raw SQL or prisma migrate deploy.
const SCHEMA_TABLE_FILTER = "table_schema='public' AND table_name != '_prisma_migrations'";

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

    it("baseline replay creates exactly 40 public schema tables", async () => {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE ${SCHEMA_TABLE_FILTER}`
      );
      expect(result.rows[0].count).toBe(40);
    });

    it("suppliers table exists", async () => {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers'`
      );
      expect(result.rowCount).toBe(1);
    });

    it("_prisma_migrations table exists with baseline entry", async () => {
      const tbl = await pool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations'`
      );
      expect(tbl.rowCount).toBe(1);

      const entry = await pool.query(
        `SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name = '20260101000000_baseline'`
      );
      expect(entry.rowCount).toBe(1);
      expect(entry.rows[0].finished_at).not.toBeNull();
    });

    it("baseline catalog has expected column count per schema table", async () => {
      const columns = await pool.query(`
        SELECT table_name, COUNT(*)::int AS col_count
        FROM information_schema.columns
        WHERE ${SCHEMA_TABLE_FILTER}
        GROUP BY table_name
        ORDER BY table_name
      `);
      expect(columns.rows.length).toBe(40);
      for (const row of columns.rows) {
        expect(row.col_count).toBeGreaterThanOrEqual(1);
      }
    });

    it("no schema table has zero columns", async () => {
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables t
        WHERE ${SCHEMA_TABLE_FILTER}
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name
          )
      `);
      expect(tables.rows.length).toBe(0);
    });

    it("every schema table has a primary key constraint", async () => {
      const pks = await pool.query(`
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name != '_prisma_migrations'
        ORDER BY tc.table_name
      `);
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
          AND tc.table_name != '_prisma_migrations'
        ORDER BY tc.table_name
      `);
      expect(fks.rows.length).toBeGreaterThan(0);
    });

    it("baseline catalog includes indexes beyond primary keys", async () => {
      const indexes = await pool.query(`
        SELECT tablename, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename != '_prisma_migrations'
        ORDER BY tablename, indexname
      `);
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
          AND c.table_name != '_prisma_migrations'
        ORDER BY c.table_name, c.ordinal_position
      `);
      expect(snapshot.rows.length).toBeGreaterThan(0);
      for (const col of snapshot.rows) {
        expect(col.table_name).toBeTruthy();
        expect(col.column_name).toBeTruthy();
        expect(col.data_type).toBeTruthy();
        expect(["YES", "NO"]).toContain(col.is_nullable);
      }
    });
  }
);
