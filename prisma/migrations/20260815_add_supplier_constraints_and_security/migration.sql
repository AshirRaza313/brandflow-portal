-- Forward migration: Supplier constraints and grants (post-baseline)
-- Assumes suppliers table already exists from baseline migration.

ALTER TABLE "public"."suppliers"
  ADD CONSTRAINT "suppliers_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));

ALTER TABLE "public"."suppliers"
  ADD CONSTRAINT "suppliers_status_check" CHECK ("status" IN ('active', 'inactive', 'blacklisted'));

REVOKE ALL PRIVILEGES ON TABLE "public"."suppliers" FROM anon, authenticated;

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
