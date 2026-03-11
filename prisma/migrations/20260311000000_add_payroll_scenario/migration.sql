-- CreateTable
CREATE TABLE "PayrollScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationOverrides" JSONB NOT NULL DEFAULT '{}',
    "benchmarkOverrides" JSONB NOT NULL DEFAULT '{}',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollScenario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayrollScenario" ADD CONSTRAINT "PayrollScenario_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
