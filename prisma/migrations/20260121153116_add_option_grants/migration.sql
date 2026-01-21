/*
  Warnings:

  - A unique constraint covering the columns `[cartaStakeholderId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cartaStakeholderId" TEXT;

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartaOptionGrant" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "vestingStartDate" TIMESTAMP(3),
    "vestingSchedule" TEXT,
    "exercisePrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "vestedQuantity" INTEGER NOT NULL,
    "expiredQuantity" INTEGER NOT NULL,

    CONSTRAINT "CartaOptionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cartaStakeholderId_key" ON "Employee"("cartaStakeholderId");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartaOptionGrant" ADD CONSTRAINT "CartaOptionGrant_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Employee"("cartaStakeholderId") ON DELETE RESTRICT ON UPDATE CASCADE;
