ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_rating_check";
ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_status_check";
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_status_check" CHECK ("status" IN ('active', 'inactive', 'blacklisted'));