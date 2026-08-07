-- CreateTable
CREATE TABLE "suppliers" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_organization_id_idx"
ON "suppliers"("organization_id");

-- CreateIndex
CREATE INDEX "suppliers_organization_id_status_idx"
ON "suppliers"("organization_id", "status");

-- CreateIndex
CREATE INDEX "suppliers_organization_id_category_idx"
ON "suppliers"("organization_id", "category");

-- AddForeignKey
ALTER TABLE "suppliers"
ADD CONSTRAINT "suppliers_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
