/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Clinic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Clinic_phone_key" ON "Clinic"("phone");
