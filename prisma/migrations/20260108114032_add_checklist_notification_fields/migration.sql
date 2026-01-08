-- AlterTable
ALTER TABLE "PerformanceProgramChecklistItem" ADD COLUMN     "lastNotificationSentAt" TIMESTAMP(3),
ADD COLUMN     "slackThreadId" TEXT;
