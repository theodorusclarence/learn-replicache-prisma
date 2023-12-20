-- CreateTable
CREATE TABLE "GithubIssue" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,

    CONSTRAINT "GithubIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubIssue_id_key" ON "GithubIssue"("id");

-- CreateIndex
CREATE UNIQUE INDEX "GithubIssue_todoId_key" ON "GithubIssue"("todoId");

-- CreateIndex
CREATE INDEX "owner_repo_number" ON "GithubIssue"("owner", "repo", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GithubIssue_owner_repo_number_key" ON "GithubIssue"("owner", "repo", "number");

-- AddForeignKey
ALTER TABLE "GithubIssue" ADD CONSTRAINT "GithubIssue_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
