/*
  Warnings:

  - A unique constraint covering the columns `[cartaStakeholderId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Employee_cartaStakeholderId_key" ON "Employee"("cartaStakeholderId");

-- AddForeignKey
ALTER TABLE "CartaOptionGrant" ADD CONSTRAINT "CartaOptionGrant_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Employee"("cartaStakeholderId") ON DELETE RESTRICT ON UPDATE CASCADE;
