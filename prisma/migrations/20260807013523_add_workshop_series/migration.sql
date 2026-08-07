-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "WorkshopSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopSeries_createdBy_idx" ON "WorkshopSeries"("createdBy");

-- CreateIndex
CREATE INDEX "Workshop_seriesId_idx" ON "Workshop"("seriesId");

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "WorkshopSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopSeries" ADD CONSTRAINT "WorkshopSeries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
