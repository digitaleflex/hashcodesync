-- CreateTable
CREATE TABLE "week_snapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "week_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_snapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "slot_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "week_snapshot_userId_idx" ON "week_snapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "week_snapshot_userId_weekStart_key" ON "week_snapshot"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "slot_snapshot_snapshotId_idx" ON "slot_snapshot"("snapshotId");

-- AddForeignKey
ALTER TABLE "week_snapshot" ADD CONSTRAINT "week_snapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_snapshot" ADD CONSTRAINT "slot_snapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "week_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
