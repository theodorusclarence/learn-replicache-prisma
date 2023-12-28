-- CreateTable
CREATE TABLE "LabelOnIssues" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "LabelOnIssues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#f1f9',

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabelOnIssues_id_key" ON "LabelOnIssues"("id");

-- CreateIndex
CREATE INDEX "label_id" ON "LabelOnIssues"("labelId");

-- CreateIndex
CREATE INDEX "issue_id" ON "LabelOnIssues"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "LabelOnIssues_labelId_issueId_key" ON "LabelOnIssues"("labelId", "issueId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_id_key" ON "Label"("id");

-- AddForeignKey
ALTER TABLE "LabelOnIssues" ADD CONSTRAINT "LabelOnIssues_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelOnIssues" ADD CONSTRAINT "LabelOnIssues_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "GithubIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
