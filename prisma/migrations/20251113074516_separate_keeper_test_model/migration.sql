/*
  Warnings:

  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DriverOrPassenger" AS ENUM ('DRIVER', 'PASSENGER');

-- CreateEnum
CREATE TYPE "KeeperTestRecommendation" AS ENUM ('STRONG_HIRE_ON_TRACK_TO_PASS_PROBATION', 'AVERAGE_HIRE_NEED_TO_SEE_IMPROVEMENTS', 'NOT_A_FIT_NEEDS_ESCALATING');

-- DropForeignKey
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_employeeId_fkey";

-- DropTable
DROP TABLE "public"."Feedback";

-- CreateTable
CREATE TABLE "KeeperTestFeedback" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "wouldYouTryToKeepThem" BOOLEAN NOT NULL,
    "whatMakesThemValuable" TEXT NOT NULL,
    "driverOrPassenger" "DriverOrPassenger" NOT NULL,
    "proactiveToday" BOOLEAN NOT NULL,
    "optimisticByDefault" BOOLEAN NOT NULL,
    "areasToWatch" TEXT NOT NULL,
    "recommendation" "KeeperTestRecommendation",
    "sharedWithTeamMember" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeeperTestFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KeeperTestFeedback" ADD CONSTRAINT "KeeperTestFeedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeeperTestFeedback" ADD CONSTRAINT "KeeperTestFeedback_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
