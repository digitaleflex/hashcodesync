-- AlterTable (issues #34, #54)
ALTER TABLE "Workshop" ADD COLUMN     "activityId" TEXT,
ADD COLUMN     "requiresMentor" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Workshop_activityId_idx" ON "Workshop"("activityId");

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "GroupActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;