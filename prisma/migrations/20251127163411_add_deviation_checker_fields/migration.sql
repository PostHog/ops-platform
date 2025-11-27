-- CreateEnum
CREATE TYPE "SalaryDeviationStatus" AS ENUM ('IN_SYNC', 'DEVIATED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "salaryDeviationCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "salaryDeviationStatus" "SalaryDeviationStatus";
