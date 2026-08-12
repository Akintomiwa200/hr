-- AlterTable
ALTER TABLE "KpiDefinition" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- AlterTable
ALTER TABLE "AppraisalCycle" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PerformanceSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "ratingScaleMax" INTEGER NOT NULL DEFAULT 5,
    "announceOnActivate" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnActivate" BOOLEAN NOT NULL DEFAULT true,
    "requireSelfBeforeManager" BOOLEAN NOT NULL DEFAULT true,
    "autoOverallFromKpis" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceSettings_companyId_key" ON "PerformanceSettings"("companyId");

DO $$ BEGIN
  ALTER TABLE "PerformanceSettings" ADD CONSTRAINT "PerformanceSettings_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AppraisalCycle" ADD CONSTRAINT "AppraisalCycle_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "KpiDefinition_companyId_isActive_idx" ON "KpiDefinition"("companyId", "isActive");
CREATE INDEX IF NOT EXISTS "AppraisalCycle_companyId_status_idx" ON "AppraisalCycle"("companyId", "status");

-- Backfill companyId from linked department / employee users where possible
UPDATE "KpiDefinition" k
SET "companyId" = d."companyId"
FROM "Department" d
WHERE k."departmentId" = d."id" AND k."companyId" IS NULL AND d."companyId" IS NOT NULL;

-- Clear seeded demo appraisals / legacy reviews so the module runs on live workflows
DELETE FROM "AppraisalKpiScore";
DELETE FROM "PerformanceAppraisal";
DELETE FROM "AppraisalCycleKpi";
DELETE FROM "AppraisalCycle";
DELETE FROM "PerformanceReview";
DELETE FROM "KpiDefinition";
DELETE FROM "Notification" WHERE "type" = 'performance';
