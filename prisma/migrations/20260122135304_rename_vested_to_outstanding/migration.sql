/*
  Warnings:

  - You are about to drop the column `vestedQuantity` on the `CartaOptionGrant` table. All the data in the column will be lost.
  - Added the required column `outstandingQuantity` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartaOptionGrant" DROP COLUMN "vestedQuantity",
ADD COLUMN     "outstandingQuantity" INTEGER NOT NULL;
