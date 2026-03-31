-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('offer_accepted', 'contract_sent', 'contract_signed', 'provisioned', 'started');

-- CreateEnum
CREATE TYPE "OnboardingTaskAssigneeType" AS ENUM ('ops', 'manager', 'kendal', 'hector', 'scott', 'new_hire');

-- CreateTable
CREATE TABLE "OnboardingRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "location" TEXT,
    "quarter" TEXT,
    "referral" BOOLEAN NOT NULL DEFAULT false,
    "referredBy" TEXT,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'offer_accepted',
    "contractType" TEXT,
    "laptopStatus" TEXT DEFAULT 'Need to order',
    "laptopEta" TIMESTAMP(3),
    "welcomeCallDate" TIMESTAMP(3),
    "notes" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "onboardingRecordId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigneeType" "OnboardingTaskAssigneeType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "lastNotificationSentAt" TIMESTAMP(3),
    "slackThreadId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingTask_onboardingRecordId_idx" ON "OnboardingTask"("onboardingRecordId");

-- CreateIndex
CREATE INDEX "OnboardingTask_dueDate_completed_idx" ON "OnboardingTask"("dueDate", "completed");

-- AddForeignKey
ALTER TABLE "OnboardingRecord" ADD CONSTRAINT "OnboardingRecord_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_onboardingRecordId_fkey" FOREIGN KEY ("onboardingRecordId") REFERENCES "OnboardingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
