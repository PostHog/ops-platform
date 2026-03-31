-- DropForeignKey
ALTER TABLE "public"."OnboardingRecord" DROP CONSTRAINT "OnboardingRecord_managerId_fkey";

-- AddForeignKey
ALTER TABLE "OnboardingRecord" ADD CONSTRAINT "OnboardingRecord_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
