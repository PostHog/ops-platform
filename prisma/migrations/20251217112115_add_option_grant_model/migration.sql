-- CreateTable
CREATE TABLE "CartaOptionGrant" (
    "id" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "vestingStartDate" TIMESTAMP(3) NOT NULL,
    "exercisePrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "vestedQuantity" INTEGER NOT NULL,

    CONSTRAINT "CartaOptionGrant_pkey" PRIMARY KEY ("id")
);
