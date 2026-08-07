-- CreateTable
CREATE TABLE "weekly_validation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_validation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_validation_userId_idx" ON "weekly_validation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_validation_userId_weekStart_key" ON "weekly_validation"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "weekly_validation" ADD CONSTRAINT "weekly_validation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
