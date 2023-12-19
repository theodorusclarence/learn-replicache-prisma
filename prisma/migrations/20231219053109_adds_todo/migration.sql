-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    "spaceId" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Todo_id_key" ON "Todo"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Todo_spaceId_key" ON "Todo"("spaceId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
