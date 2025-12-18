/*
  Warnings:

  - Added the required column `grantId` to the `CartaOptionGrant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartaOptionGrant" ADD COLUMN     "grantId" TEXT NOT NULL;
