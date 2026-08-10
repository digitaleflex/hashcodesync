-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "menteeId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'atelier';

-- CreateIndex
CREATE INDEX "Workshop_type_idx" ON "Workshop"("type");

-- CreateIndex
CREATE INDEX "Workshop_menteeId_idx" ON "Workshop"("menteeId");

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
