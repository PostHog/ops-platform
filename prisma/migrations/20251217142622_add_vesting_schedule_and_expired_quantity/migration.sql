/*
  Warnings:

  - Added the required column `expiredQuantity` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartaOptionGrant" ADD COLUMN     "expiredQuantity" INTEGER NOT NULL,
ADD COLUMN     "vestingSchedule" TEXT,
ALTER COLUMN "vestingStartDate" DROP NOT NULL;
