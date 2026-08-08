-- CreateTable
CREATE TABLE "week_validation_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "week_validation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "week_validation_log_userId_weekStart_idx" ON "week_validation_log"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "week_validation_log_userId_idx" ON "week_validation_log"("userId");

-- AddForeignKey
ALTER TABLE "week_validation_log" ADD CONSTRAINT "week_validation_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
