/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Vet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_vetId_fkey";

-- AlterTable
ALTER TABLE "Vet" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Vet_userId_key" ON "Vet"("userId");

-- AddForeignKey
ALTER TABLE "Vet" ADD CONSTRAINT "Vet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
