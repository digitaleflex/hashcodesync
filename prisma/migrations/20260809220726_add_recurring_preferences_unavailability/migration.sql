-- CreateTable
CREATE TABLE "RecurringAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayMask" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "groupId" TEXT,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredDays" INTEGER NOT NULL DEFAULT 0,
    "morning" BOOLEAN NOT NULL DEFAULT true,
    "afternoon" BOOLEAN NOT NULL DEFAULT true,
    "evening" BOOLEAN NOT NULL DEFAULT true,
    "preferredDurationHours" INTEGER,
    "wantsWorkshops" BOOLEAN NOT NULL DEFAULT true,
    "wantsMentoring" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "maxHoursPerWeek" INTEGER,
    "maxWorkshopsPerWeek" INTEGER,
    "maxMentorshipPerWeek" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringAvailability_userId_idx" ON "RecurringAvailability"("userId");

-- CreateIndex
CREATE INDEX "RecurringAvailability_groupId_idx" ON "RecurringAvailability"("groupId");

-- CreateIndex
CREATE INDEX "RecurringAvailability_activityId_idx" ON "RecurringAvailability"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPreferences_userId_key" ON "PlanningPreferences"("userId");

-- CreateIndex
CREATE INDEX "PlanningPreferences_userId_idx" ON "PlanningPreferences"("userId");

-- CreateIndex
CREATE INDEX "Unavailability_userId_idx" ON "Unavailability"("userId");

-- CreateIndex
CREATE INDEX "Unavailability_userId_startDate_idx" ON "Unavailability"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "RecurringAvailability" ADD CONSTRAINT "RecurringAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAvailability" ADD CONSTRAINT "RecurringAvailability_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAvailability" ADD CONSTRAINT "RecurringAvailability_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "GroupActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningPreferences" ADD CONSTRAINT "PlanningPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
