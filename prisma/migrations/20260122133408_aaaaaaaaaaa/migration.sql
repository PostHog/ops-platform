/*
  Warnings:

  - You are about to drop the column `quantity` on the `CartaOptionGrant` table. All the data in the column will be lost.
  - Added the required column `exercisedQuantity` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issuedQuantity` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartaOptionGrant" DROP COLUMN "quantity",
ADD COLUMN     "exercisedQuantity" INTEGER NOT NULL,
ADD COLUMN     "issuedQuantity" INTEGER NOT NULL;
