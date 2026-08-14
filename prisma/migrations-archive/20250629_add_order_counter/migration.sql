-- AlterTable: Add atomic orderCounter to Organization
ALTER TABLE "Organization" ADD COLUMN "orderCounter" INTEGER NOT NULL DEFAULT 0;
