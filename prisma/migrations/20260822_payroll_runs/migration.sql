-- Add ACCOUNT_OFFICER role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNT_OFFICER';

-- AlterTable PayrollRecord
ALTER TABLE "PayrollRecord" ADD COLUMN IF NOT EXISTS "payrollRunId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollRecord_payrollRunId_idx" ON "PayrollRecord"("payrollRunId");
CREATE INDEX IF NOT EXISTS "PayrollRecord_periodStart_periodEnd_idx" ON "PayrollRecord"("periodStart", "periodEnd");

-- CreateTable PayrollRun
CREATE TABLE IF NOT EXISTS "PayrollRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayrollRun_companyId_periodStart_idx" ON "PayrollRun"("companyId", "periodStart");

DO $$ BEGIN
  ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_payrollRunId_fkey"
    FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
