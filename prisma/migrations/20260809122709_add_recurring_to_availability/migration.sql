-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "recurring" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Availability_userId_day_idx" ON "Availability"("userId", "day");
