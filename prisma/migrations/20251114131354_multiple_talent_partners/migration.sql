/*
  Warnings:

  - You are about to drop the column `talentPartnerId` on the `ProposedHire` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Priority" ADD VALUE 'pushed_to_next_quarter';
ALTER TYPE "Priority" ADD VALUE 'filled';

-- DropForeignKey
ALTER TABLE "public"."ProposedHire" DROP CONSTRAINT "ProposedHire_talentPartnerId_fkey";

-- AlterTable
ALTER TABLE "ProposedHire" DROP COLUMN "talentPartnerId";

-- CreateTable
CREATE TABLE "_EmployeeToProposedHire" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeToProposedHire_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EmployeeToProposedHire_B_index" ON "_EmployeeToProposedHire"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeToProposedHire" ADD CONSTRAINT "_EmployeeToProposedHire_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToProposedHire" ADD CONSTRAINT "_EmployeeToProposedHire_B_fkey" FOREIGN KEY ("B") REFERENCES "ProposedHire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
