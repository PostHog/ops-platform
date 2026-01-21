/*
  Warnings:

  - You are about to drop the column `assignedToDeelEmployeeId` on the `PerformanceProgramChecklistItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PerformanceProgramChecklistItem" DROP CONSTRAINT "PerformanceProgramChecklistItem_assignedToDeelEmployeeId_fkey";

-- AlterTable
ALTER TABLE "PerformanceProgramChecklistItem" DROP COLUMN "assignedToDeelEmployeeId",
ADD COLUMN     "assignedToEmployeeId" TEXT;

-- AddForeignKey
ALTER TABLE "PerformanceProgramChecklistItem" ADD CONSTRAINT "PerformanceProgramChecklistItem_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
