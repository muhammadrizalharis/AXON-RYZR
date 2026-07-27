-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "assets_isPublic_createdAt_idx" ON "assets"("isPublic", "createdAt");

