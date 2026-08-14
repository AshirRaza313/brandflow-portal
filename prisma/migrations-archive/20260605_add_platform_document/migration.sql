-- CreateTable: PlatformDocument
-- Stores metadata for files uploaded by platform admin (Cloudinary-backed).
-- Text-based documents are stored in SystemSetting (category: "documents").
-- This model is for binary/file uploads that go to Cloudinary storage.

CREATE TABLE "PlatformDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'document',
    "cloudinaryUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'uploaded',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformDocument_category_idx" ON "PlatformDocument"("category");

-- CreateIndex
CREATE INDEX "PlatformDocument_isActive_idx" ON "PlatformDocument"("isActive");

-- CreateIndex
CREATE INDEX "PlatformDocument_fileType_idx" ON "PlatformDocument"("fileType");
