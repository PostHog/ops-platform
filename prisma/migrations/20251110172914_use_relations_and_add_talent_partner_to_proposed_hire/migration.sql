/*
  Warnings:

  - You are about to drop the column `managerEmail` on the `ProposedHire` table. All the data in the column will be lost.
  - Added the required column `managerId` to the `ProposedHire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `talentPartnerId` to the `ProposedHire` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProposedHire" DROP COLUMN "managerEmail",
ADD COLUMN     "managerId" TEXT NOT NULL,
ADD COLUMN     "talentPartnerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ProposedHire" ADD CONSTRAINT "ProposedHire_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedHire" ADD CONSTRAINT "ProposedHire_talentPartnerId_fkey" FOREIGN KEY ("talentPartnerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
