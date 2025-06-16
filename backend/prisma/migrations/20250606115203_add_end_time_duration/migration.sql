/*
  Warnings:

  - Added the required column `duration` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- Add the new columns as Nullable initially
ALTER TABLE "Appointment" 
ADD COLUMN "duration" INTEGER Null;

ALTER TABLE "Appointment"
ADD COLUMN "endTime" TIMESTAMP NULL;

-- Backfill existing rows with a 30 minute default

UPDATE "Appointment"
SET
  "duration" = 30,
  "endTime" = "date" + INTERVAL '30 minutes'
WHERE
  "duration" IS NULL; -- this targets all existing rows

-- Alter the columns to be NOT NULL
ALTER TABLE "Appointment"
ALTER COLUMN "duration" SET NOT NULL;

ALTER TABLE "Appointment"
ALTER COLUMN "endTime" SET NOT NULL;