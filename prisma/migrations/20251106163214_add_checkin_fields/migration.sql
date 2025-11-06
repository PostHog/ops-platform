-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "checkIn30DaysScheduled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "checkIn60DaysScheduled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "checkIn80DaysScheduled" BOOLEAN NOT NULL DEFAULT true;
