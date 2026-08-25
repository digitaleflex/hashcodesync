ALTER TABLE "user" ADD COLUMN "calendarToken" TEXT;
CREATE UNIQUE INDEX "user_calendarToken_key" ON "user"("calendarToken");
