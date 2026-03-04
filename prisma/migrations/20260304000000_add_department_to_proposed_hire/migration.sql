-- CreateEnum
CREATE TYPE "Department" AS ENUM ('RD', 'SM', 'GA');

-- AlterTable
ALTER TABLE "ProposedHire" ADD COLUMN "department" "Department";
