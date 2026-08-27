-- CreateTable
CREATE TABLE IF NOT EXISTS "PortalTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PortalDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "templateId" TEXT,
    "employeeId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fieldValuesJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedByName" TEXT,
    "issuedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalTemplate_companyId_kind_idx" ON "PortalTemplate"("companyId", "kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalDocument_companyId_kind_idx" ON "PortalDocument"("companyId", "kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalDocument_employeeId_status_idx" ON "PortalDocument"("employeeId", "status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PortalTemplate" ADD CONSTRAINT "PortalTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PortalDocument" ADD CONSTRAINT "PortalDocument_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PortalDocument" ADD CONSTRAINT "PortalDocument_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "PortalTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PortalDocument" ADD CONSTRAINT "PortalDocument_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
