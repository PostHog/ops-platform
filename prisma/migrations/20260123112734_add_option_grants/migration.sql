/*
  Warnings:

  - A unique constraint covering the columns `[cartaStakeholderId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cartaStakeholderId" TEXT,
ADD COLUMN     "previousEquityRefreshes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Salary" ADD COLUMN     "equityRefreshDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CartaOptionGrant" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "vestingStartDate" TIMESTAMP(3),
    "vestingSchedule" TEXT,
    "exercisePrice" DOUBLE PRECISION NOT NULL,
    "issuedQuantity" INTEGER NOT NULL,
    "exercisedQuantity" INTEGER NOT NULL,
    "vestedQuantity" INTEGER NOT NULL,
    "expiredQuantity" INTEGER NOT NULL,

    CONSTRAINT "CartaOptionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cartaStakeholderId_key" ON "Employee"("cartaStakeholderId");

-- AddForeignKey
ALTER TABLE "CartaOptionGrant" ADD CONSTRAINT "CartaOptionGrant_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Employee"("cartaStakeholderId") ON DELETE RESTRICT ON UPDATE CASCADE;
