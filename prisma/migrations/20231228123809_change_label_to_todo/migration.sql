/*
  Warnings:

  - You are about to drop the `LabelOnIssues` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LabelOnIssues" DROP CONSTRAINT "LabelOnIssues_labelId_fkey";

-- DropForeignKey
ALTER TABLE "LabelOnIssues" DROP CONSTRAINT "LabelOnIssues_todoId_fkey";

-- DropTable
DROP TABLE "LabelOnIssues";

-- CreateTable
CREATE TABLE "LabelOnTodo" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,

    CONSTRAINT "LabelOnTodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelOnTodo_id_key" ON "LabelOnTodo"("id");

-- CreateIndex
CREATE INDEX "label_id" ON "LabelOnTodo"("labelId");

-- CreateIndex
CREATE INDEX "label_todo_id" ON "LabelOnTodo"("todoId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelOnTodo_labelId_todoId_key" ON "LabelOnTodo"("labelId", "todoId");

-- AddForeignKey
ALTER TABLE "LabelOnTodo" ADD CONSTRAINT "LabelOnTodo_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelOnTodo" ADD CONSTRAINT "LabelOnTodo_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
