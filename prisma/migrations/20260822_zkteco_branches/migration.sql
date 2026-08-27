-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_name_key" ON "Branch"("companyId", "name");

-- CreateIndex
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Employee
ALTER TABLE "Employee" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "biometricPin" TEXT;

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE INDEX "Employee_biometricPin_idx" ON "Employee"("biometricPin");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable AttendanceDevice
ALTER TABLE "AttendanceDevice" ADD COLUMN "branchId" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "vendor" TEXT NOT NULL DEFAULT 'ZKTECO';
ALTER TABLE "AttendanceDevice" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "model" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "firmware" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "timezone" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "attStamp" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "opStamp" TEXT;
ALTER TABLE "AttendanceDevice" ADD COLUMN "deviceInfo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDevice_serialNumber_key" ON "AttendanceDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "AttendanceDevice_companyId_branchId_idx" ON "AttendanceDevice"("companyId", "branchId");

-- AddForeignKey
ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AttendanceDeviceCommand" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "cmdId" INTEGER NOT NULL,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "ackedAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceDeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceDeviceCommand_deviceId_status_idx" ON "AttendanceDeviceCommand"("deviceId", "status");

-- AddForeignKey
ALTER TABLE "AttendanceDeviceCommand" ADD CONSTRAINT "AttendanceDeviceCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AttendancePunchLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "verifyType" INTEGER,
    "workCode" INTEGER,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "attendanceId" TEXT,
    "employeeId" TEXT,
    "error" TEXT,
    "rawLine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePunchLog_serialNumber_pin_punchedAt_statusCode_key" ON "AttendancePunchLog"("serialNumber", "pin", "punchedAt", "statusCode");

-- CreateIndex
CREATE INDEX "AttendancePunchLog_deviceId_punchedAt_idx" ON "AttendancePunchLog"("deviceId", "punchedAt");

-- AddForeignKey
ALTER TABLE "AttendancePunchLog" ADD CONSTRAINT "AttendancePunchLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
