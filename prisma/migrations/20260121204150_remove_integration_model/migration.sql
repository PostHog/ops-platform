/*
  Warnings:

  - You are about to drop the `Integration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Integration" DROP CONSTRAINT "Integration_created_by_id_fkey";

-- DropTable
DROP TABLE "public"."Integration";
