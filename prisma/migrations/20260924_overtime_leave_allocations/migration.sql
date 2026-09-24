-- Overtime calculation settings (payroll)
ALTER TABLE "PayrollSettings" ADD COLUMN IF NOT EXISTS "overtimeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayrollSettings" ADD COLUMN IF NOT EXISTS "overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.75;
ALTER TABLE "PayrollSettings" ADD COLUMN IF NOT EXISTS "overtimeThresholdMinutes" INTEGER NOT NULL DEFAULT 30;

-- Official work end time (attendance)
ALTER TABLE "AttendanceSettings" ADD COLUMN IF NOT EXISTS "workEndHour" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "AttendanceSettings" ADD COLUMN IF NOT EXISTS "workEndMinute" INTEGER NOT NULL DEFAULT 0;

-- Leave allocation policy (enabled by a privileged account)
CREATE TABLE IF NOT EXISTS "LeaveSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "allocationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultAnnualDays" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "defaultSickDays" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaveSettings_companyId_key" ON "LeaveSettings"("companyId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeaveSettings_companyId_fkey'
    ) THEN
        ALTER TABLE "LeaveSettings" ADD CONSTRAINT "LeaveSettings_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Yearly leave allowance per employee per leave type
CREATE TABLE IF NOT EXISTS "LeaveAllocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "LeaveType" NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaveAllocation_employeeId_year_type_key"
    ON "LeaveAllocation"("employeeId", "year", "type");
CREATE INDEX IF NOT EXISTS "LeaveAllocation_companyId_year_idx"
    ON "LeaveAllocation"("companyId", "year");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeaveAllocation_employeeId_fkey'
    ) THEN
        ALTER TABLE "LeaveAllocation" ADD CONSTRAINT "LeaveAllocation_employeeId_fkey"
            FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LeaveAllocation_companyId_fkey'
    ) THEN
        ALTER TABLE "LeaveAllocation" ADD CONSTRAINT "LeaveAllocation_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;