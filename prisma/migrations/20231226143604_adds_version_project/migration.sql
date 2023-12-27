/*
  Warnings:

  - Added the required column `version` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "version" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
