-- CreateEnum
CREATE TYPE "PerformanceProgramStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ChecklistItemType" AS ENUM ('SLACK_FEEDBACK_MEETING', 'EMAIL_FEEDBACK_MEETING');

-- CreateTable
CREATE TABLE "PerformanceProgram" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PerformanceProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "startedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceProgramChecklistItem" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "type" "ChecklistItemType" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "assignedToDeelEmployeeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceProgramChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "feedbackId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceProgramFeedback" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "givenByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceProgramFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PerformanceProgram" ADD CONSTRAINT "PerformanceProgram_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgram" ADD CONSTRAINT "PerformanceProgram_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgramChecklistItem" ADD CONSTRAINT "PerformanceProgramChecklistItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PerformanceProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgramChecklistItem" ADD CONSTRAINT "PerformanceProgramChecklistItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgramChecklistItem" ADD CONSTRAINT "PerformanceProgramChecklistItem_assignedToDeelEmployeeId_fkey" FOREIGN KEY ("assignedToDeelEmployeeId") REFERENCES "DeelEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "PerformanceProgramChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "PerformanceProgramFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgramFeedback" ADD CONSTRAINT "PerformanceProgramFeedback_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PerformanceProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceProgramFeedback" ADD CONSTRAINT "PerformanceProgramFeedback_givenByUserId_fkey" FOREIGN KEY ("givenByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
