/*
  Warnings:

  - You are about to drop the column `agentId` on the `AgentConversation` table. All the data in the column will be lost.
  - You are about to drop the `Agent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AgentTool` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Agent" DROP CONSTRAINT "Agent_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."AgentConversation" DROP CONSTRAINT "AgentConversation_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AgentTool" DROP CONSTRAINT "AgentTool_agentId_fkey";

-- DropIndex
DROP INDEX "public"."AgentConversation_agentId_idx";

-- AlterTable
ALTER TABLE "AgentConversation" DROP COLUMN "agentId";

-- DropTable
DROP TABLE "public"."Agent";

-- DropTable
DROP TABLE "public"."AgentTool";
