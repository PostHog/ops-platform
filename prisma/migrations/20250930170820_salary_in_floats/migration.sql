/*
  Warnings:

  - The primary key for the `Employee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `notes` on the `Employee` table. All the data in the column will be lost.
  - The primary key for the `Salary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `lastChangeAmount` on the `Salary` table. All the data in the column will be lost.
  - You are about to drop the column `lastChangePercentage` on the `Salary` table. All the data in the column will be lost.
  - Changed the type of `priority` on the `Employee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `actualSalary` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualSalaryLocal` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountTakenInOptions` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `benchmark` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changeAmount` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changePercentage` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchangeRate` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationFactor` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notes` to the `Salary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSalaryLocal` to the `Salary` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('low', 'high', 'medium');

-- DropForeignKey
ALTER TABLE "public"."Salary" DROP CONSTRAINT "Salary_employeeId_fkey";

-- AlterTable
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_pkey",
DROP COLUMN "notes",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "priority",
ADD COLUMN     "priority" "public"."Priority" NOT NULL,
ADD CONSTRAINT "Employee_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Employee_id_seq";

-- AlterTable
ALTER TABLE "public"."Salary" DROP CONSTRAINT "Salary_pkey",
DROP COLUMN "lastChangeAmount",
DROP COLUMN "lastChangePercentage",
ADD COLUMN     "actualSalary" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "actualSalaryLocal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "amountTakenInOptions" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "benchmark" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "changeAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "changePercentage" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locationFactor" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "notes" TEXT NOT NULL,
ADD COLUMN     "totalSalaryLocal" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "level" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "step" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalSalary" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "employeeId" SET DATA TYPE TEXT,
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "Salary_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Salary_id_seq";

-- AddForeignKey
ALTER TABLE "public"."Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
