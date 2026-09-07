-- Fix incorrect weekStart values in WeeklyValidation table
-- The weekStart values were stored as the end of the previous week (Saturday 23:00)
-- instead of the start of the current week (Monday 00:00).

UPDATE weekly_validation
  SET "weekStart" = '2026-09-07 00:00:00'::timestamp;
