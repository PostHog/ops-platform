-- CreateTable
CREATE TABLE "ProcessDocument" (
    "id" TEXT NOT NULL DEFAULT 'process',
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessDocument_pkey" PRIMARY KEY ("id")
);
