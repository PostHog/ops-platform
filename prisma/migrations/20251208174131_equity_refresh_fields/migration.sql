-- AlterTable
ALTER TABLE "Salary" ADD COLUMN     "equityRefreshAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "equityRefreshGranted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "equityRefreshPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;
