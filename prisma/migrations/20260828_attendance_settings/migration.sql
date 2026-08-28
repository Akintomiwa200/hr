-- AttendanceStatus: add EARLY
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'EARLY';

-- Employee shift fields
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isShiftWorker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftStartHour" INTEGER;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftStartMinute" INTEGER;

-- Company attendance settings
CREATE TABLE IF NOT EXISTS "AttendanceSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workStartMinute" INTEGER NOT NULL DEFAULT 0,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "breakTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxBreakMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceSettings_companyId_key" ON "AttendanceSettings"("companyId");

DO $$ BEGIN
  ALTER TABLE "AttendanceSettings" ADD CONSTRAINT "AttendanceSettings_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Break time rows
CREATE TABLE IF NOT EXISTS "AttendanceBreak" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "breakStart" TIMESTAMP(3) NOT NULL,
    "breakEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AttendanceBreak_employeeId_date_idx" ON "AttendanceBreak"("employeeId", "date");
CREATE INDEX IF NOT EXISTS "AttendanceBreak_attendanceId_idx" ON "AttendanceBreak"("attendanceId");

DO $$ BEGIN
  ALTER TABLE "AttendanceBreak" ADD CONSTRAINT "AttendanceBreak_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AttendanceBreak" ADD CONSTRAINT "AttendanceBreak_attendanceId_fkey"
    FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
