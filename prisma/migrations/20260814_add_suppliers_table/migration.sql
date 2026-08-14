-- Create suppliers table with performance ratings and status check constraints

CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "status" TEXT NOT NULL DEFAULT 'active',
    "address" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suppliers_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5)),
    CONSTRAINT "suppliers_status_check" CHECK ("status" IN ('active', 'inactive', 'blacklisted')),
    CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "suppliers_organizationId_idx" ON "public"."suppliers"("organization_id");
CREATE INDEX "suppliers_organizationId_status_idx" ON "public"."suppliers"("organization_id", "status");
CREATE INDEX "suppliers_organizationId_category_idx" ON "public"."suppliers"("organization_id", "category");
