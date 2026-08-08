-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "capacity" INTEGER;
ALTER TABLE "Workshop" ADD COLUMN     "location" TEXT;
ALTER TABLE "Workshop" ADD COLUMN     "meetingUrl" TEXT;

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopFeedback" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkshopFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_workshopId_userId_key" ON "Waitlist"("workshopId", "userId");

-- CreateIndex
CREATE INDEX "Waitlist_userId_idx" ON "Waitlist"("userId");

-- CreateIndex
CREATE INDEX "Waitlist_workshopId_idx" ON "Waitlist"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopFeedback_workshopId_userId_key" ON "WorkshopFeedback"("workshopId", "userId");

-- CreateIndex
CREATE INDEX "WorkshopFeedback_userId_idx" ON "WorkshopFeedback"("userId");

-- CreateIndex
CREATE INDEX "WorkshopFeedback_workshopId_idx" ON "WorkshopFeedback"("workshopId");

-- AddForeignKey
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopFeedback" ADD CONSTRAINT "WorkshopFeedback_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopFeedback" ADD CONSTRAINT "WorkshopFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
