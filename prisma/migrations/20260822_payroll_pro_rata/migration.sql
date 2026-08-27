-- AlterTable
ALTER TABLE "PayrollSettings" ADD COLUMN IF NOT EXISTS "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "PayrollSettings" ADD COLUMN IF NOT EXISTS "proRataSalaryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollDeduction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "periodMonth" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "appliedPayrollId" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollDeduction_employeeId_status_idx" ON "PayrollDeduction"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "PayrollDeduction_companyId_status_idx" ON "PayrollDeduction"("companyId", "status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PayrollDeduction" ADD CONSTRAINT "PayrollDeduction_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
