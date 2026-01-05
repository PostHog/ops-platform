-- CreateTable
CREATE TABLE "AshbyInterviewScore" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AshbyInterviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AshbyInterviewScore_employeeId_idx" ON "AshbyInterviewScore"("employeeId");

-- CreateIndex
CREATE INDEX "AshbyInterviewScore_interviewerId_idx" ON "AshbyInterviewScore"("interviewerId");

-- AddForeignKey
ALTER TABLE "AshbyInterviewScore" ADD CONSTRAINT "AshbyInterviewScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AshbyInterviewScore" ADD CONSTRAINT "AshbyInterviewScore_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
