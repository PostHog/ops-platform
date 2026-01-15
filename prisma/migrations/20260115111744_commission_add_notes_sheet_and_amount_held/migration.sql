-- AlterTable
ALTER TABLE "CommissionBonus" ADD COLUMN     "amountHeld" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sheet" TEXT;
