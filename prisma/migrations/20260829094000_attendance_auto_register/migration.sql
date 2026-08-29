-- Auto-register ZKTeco terminals on first PUSH heartbeat (/iclock)
ALTER TABLE "AttendanceSettings" ADD COLUMN IF NOT EXISTS "autoRegisterDevices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AttendanceSettings" ADD COLUMN IF NOT EXISTS "autoRegisterBranchId" TEXT;
