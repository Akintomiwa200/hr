-- Employee document folders (root = employee name, child = requested document)
ALTER TABLE "DocumentFolder" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "DocumentFolder" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "DocumentFolder_companyId_idx" ON "DocumentFolder"("companyId");
CREATE INDEX IF NOT EXISTS "DocumentFolder_employeeId_idx" ON "DocumentFolder"("employeeId");
CREATE INDEX IF NOT EXISTS "DocumentFolder_parentId_idx" ON "DocumentFolder"("parentId");

ALTER TABLE "DocumentFolder"
  DROP CONSTRAINT IF EXISTS "DocumentFolder_employeeId_fkey",
  ADD CONSTRAINT "DocumentFolder_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentFolder"
  DROP CONSTRAINT IF EXISTS "DocumentFolder_parentId_fkey",
  ADD CONSTRAINT "DocumentFolder_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Passwordless upload links
CREATE TABLE IF NOT EXISTS "DocumentUploadLink" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "companyId" TEXT,
  "employeeId" TEXT NOT NULL,
  "folderId" TEXT NOT NULL,
  "subfolderId" TEXT,
  "taskId" TEXT,
  "documentName" TEXT NOT NULL,
  "createdById" TEXT,
  "createdByName" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "maxUploads" INTEGER NOT NULL DEFAULT 10,
  "uploadCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentUploadLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentUploadLink_token_key" ON "DocumentUploadLink"("token");
CREATE INDEX IF NOT EXISTS "DocumentUploadLink_employeeId_idx" ON "DocumentUploadLink"("employeeId");
CREATE INDEX IF NOT EXISTS "DocumentUploadLink_folderId_idx" ON "DocumentUploadLink"("folderId");
CREATE INDEX IF NOT EXISTS "DocumentUploadLink_subfolderId_idx" ON "DocumentUploadLink"("subfolderId");
CREATE INDEX IF NOT EXISTS "DocumentUploadLink_taskId_idx" ON "DocumentUploadLink"("taskId");

ALTER TABLE "DocumentUploadLink"
  DROP CONSTRAINT IF EXISTS "DocumentUploadLink_companyId_fkey",
  ADD CONSTRAINT "DocumentUploadLink_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentUploadLink"
  DROP CONSTRAINT IF EXISTS "DocumentUploadLink_employeeId_fkey",
  ADD CONSTRAINT "DocumentUploadLink_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentUploadLink"
  DROP CONSTRAINT IF EXISTS "DocumentUploadLink_folderId_fkey",
  ADD CONSTRAINT "DocumentUploadLink_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentUploadLink"
  DROP CONSTRAINT IF EXISTS "DocumentUploadLink_subfolderId_fkey",
  ADD CONSTRAINT "DocumentUploadLink_subfolderId_fkey"
    FOREIGN KEY ("subfolderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentUploadLink"
  DROP CONSTRAINT IF EXISTS "DocumentUploadLink_taskId_fkey",
  ADD CONSTRAINT "DocumentUploadLink_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "ChecklistTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
