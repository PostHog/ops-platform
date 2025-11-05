-- CreateTable
CREATE TABLE "ProposedHire" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "hiringProfile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposedHire_pkey" PRIMARY KEY ("id")
);
