-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "reviewd" BOOLEAN NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Salary" (
    "id" SERIAL NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "totalSalary" INTEGER NOT NULL,
    "lastChangePercentage" INTEGER NOT NULL,
    "lastChangeAmount" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
