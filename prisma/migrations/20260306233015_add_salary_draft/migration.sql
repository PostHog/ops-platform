-- CreateTable
CREATE TABLE "SalaryDraft" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "step" DOUBLE PRECISION NOT NULL,
    "benchmark" TEXT NOT NULL,
    "employmentCountry" TEXT,
    "employmentArea" TEXT,
    "amountTakenInOptions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equityRefreshPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "showOverride" BOOLEAN NOT NULL DEFAULT false,
    "totalSalaryOverride" DOUBLE PRECISION,
    "bonusPercentageOverride" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalaryDraft_employeeId_key" ON "SalaryDraft"("employeeId");

-- AddForeignKey
ALTER TABLE "SalaryDraft" ADD CONSTRAINT "SalaryDraft_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
