/*
  Warnings:

  - You are about to drop the column `issueId` on the `LabelOnIssues` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[labelId,todoId]` on the table `LabelOnIssues` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `todoId` to the `LabelOnIssues` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LabelOnIssues" DROP CONSTRAINT "LabelOnIssues_issueId_fkey";

-- DropIndex
DROP INDEX "LabelOnIssues_labelId_issueId_key";

-- DropIndex
DROP INDEX "issue_id";

-- AlterTable
ALTER TABLE "LabelOnIssues" DROP COLUMN "issueId",
ADD COLUMN     "todoId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "label_todo_id" ON "LabelOnIssues"("todoId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelOnIssues_labelId_todoId_key" ON "LabelOnIssues"("labelId", "todoId");

-- AddForeignKey
ALTER TABLE "LabelOnIssues" ADD CONSTRAINT "LabelOnIssues_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
