/*
  Warnings:

  - You are about to drop the column `outstandingQuantity` on the `CartaOptionGrant` table. All the data in the column will be lost.
  - Added the required column `vestedQuantity` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartaOptionGrant" DROP COLUMN "outstandingQuantity",
ADD COLUMN     "vestedQuantity" INTEGER NOT NULL;
