/*
  Warnings:

  - You are about to drop the column `duration` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Appointment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "duration",
DROP COLUMN "status",
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "slotMinutes" INTEGER NOT NULL DEFAULT 30;

-- DropEnum
DROP TYPE "AppointmentStatus";
