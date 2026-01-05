-- CreateTable
CREATE TABLE "CommissionBonus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "quota" DOUBLE PRECISION NOT NULL,
    "attainment" DOUBLE PRECISION NOT NULL,
    "bonusAmount" DOUBLE PRECISION NOT NULL,
    "calculatedAmount" DOUBLE PRECISION NOT NULL,
    "communicated" BOOLEAN NOT NULL DEFAULT false,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionBonus_employeeId_quarter_key" ON "CommissionBonus"("employeeId", "quarter");

-- AddForeignKey
ALTER TABLE "CommissionBonus" ADD CONSTRAINT "CommissionBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
