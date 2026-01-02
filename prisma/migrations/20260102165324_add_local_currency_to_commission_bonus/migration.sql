/*
  Warnings:

  - Added the required column `calculatedAmountLocal` to the `CommissionBonus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `CommissionBonus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localCurrency` to the `CommissionBonus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CommissionBonus" ADD COLUMN     "calculatedAmountLocal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "localCurrency" TEXT NOT NULL;
