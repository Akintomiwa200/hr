-- AlterTable
ALTER TABLE "ChecklistTemplateTask" ADD COLUMN IF NOT EXISTS "requiredDocuments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "ChecklistTemplateTask" ALTER COLUMN "assigneeType" SET DEFAULT 'ANYONE';

-- AlterTable
ALTER TABLE "ChecklistTask" ADD COLUMN IF NOT EXISTS "requiredDocuments" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChecklistTaskFile" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publicId" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTaskFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChecklistTaskFile_taskId_idx" ON "ChecklistTaskFile"("taskId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChecklistTaskFile" ADD CONSTRAINT "ChecklistTaskFile_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ChecklistTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
