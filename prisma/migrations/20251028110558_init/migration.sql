-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('low', 'high', 'medium');

-- CreateEnum
CREATE TYPE "public"."CyclotronQueueName" AS ENUM ('send_keeper_test', 'receive_keeper_test_results', 'dead_letter');

-- CreateEnum
CREATE TYPE "public"."CyclotronJobState" AS ENUM ('running', 'available', 'failed');

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "priority" "public"."Priority" NOT NULL,
    "reviewed" BOOLEAN NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeelEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "workEmail" TEXT,
    "personalEmail" TEXT,
    "managerId" TEXT,
    "topLevelManagerId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeelEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Salary" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "locationFactor" DOUBLE PRECISION NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "step" DOUBLE PRECISION NOT NULL,
    "benchmark" TEXT NOT NULL,
    "benchmarkFactor" DOUBLE PRECISION NOT NULL,
    "totalSalary" DOUBLE PRECISION NOT NULL,
    "changePercentage" DOUBLE PRECISION NOT NULL,
    "changeAmount" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "localCurrency" TEXT NOT NULL,
    "totalSalaryLocal" DOUBLE PRECISION NOT NULL,
    "amountTakenInOptions" DOUBLE PRECISION NOT NULL,
    "actualSalary" DOUBLE PRECISION NOT NULL,
    "actualSalaryLocal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "communicated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CyclotronJob" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queue_name" "public"."CyclotronQueueName" NOT NULL,
    "lock_id" TEXT,
    "state" "public"."CyclotronJobState" NOT NULL DEFAULT 'available',
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "failure_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CyclotronJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "public"."Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DeelEmployee_workEmail_key" ON "public"."DeelEmployee"("workEmail");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token");

-- AddForeignKey
ALTER TABLE "public"."DeelEmployee" ADD CONSTRAINT "DeelEmployee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."DeelEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeelEmployee" ADD CONSTRAINT "DeelEmployee_topLevelManagerId_fkey" FOREIGN KEY ("topLevelManagerId") REFERENCES "public"."DeelEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeelEmployee" ADD CONSTRAINT "DeelEmployee_workEmail_fkey" FOREIGN KEY ("workEmail") REFERENCES "public"."Employee"("email") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
