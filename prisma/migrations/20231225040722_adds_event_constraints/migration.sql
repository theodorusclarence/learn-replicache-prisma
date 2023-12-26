/*
  Warnings:

  - A unique constraint covering the columns `[todoId,type]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "todo_id" ON "Event"("todoId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_todoId_type_key" ON "Event"("todoId", "type");
