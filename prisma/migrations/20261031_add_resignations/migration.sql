-- CreateEnum
CREATE TYPE "ResignationStatus" AS ENUM ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED');

-- CreateTable
CREATE TABLE "ResignationSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 30,
    "managerEndorsementRequired" BOOLEAN NOT NULL DEFAULT true,
    "hrApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "autoStartOffboarding" BOOLEAN NOT NULL DEFAULT true,
    "allowWithdrawal" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResignationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resignation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "status" "ResignationStatus" NOT NULL DEFAULT 'PENDING_MANAGER',
    "reason" TEXT NOT NULL,
    "noticePeriodDays" INTEGER NOT NULL,
    "requestedLastWorkingDay" TIMESTAMP(3) NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT,
    "managerNote" TEXT,
    "managerReviewedAt" TIMESTAMP(3),
    "hrReviewerId" TEXT,
    "hrNote" TEXT,
    "hrReviewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "offboardingInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResignationEvent" (
    "id" TEXT NOT NULL,
    "resignationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResignationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResignationSettings_companyId_key" ON "ResignationSettings"("companyId");

-- CreateIndex
CREATE INDEX "Resignation_companyId_status_idx" ON "Resignation"("companyId", "status");

-- CreateIndex
CREATE INDEX "Resignation_employeeId_createdAt_idx" ON "Resignation"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Resignation_managerId_idx" ON "Resignation"("managerId");

-- CreateIndex
CREATE INDEX "ResignationEvent_resignationId_createdAt_idx" ON "ResignationEvent"("resignationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResignationSettings" ADD CONSTRAINT "ResignationSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_hrReviewerId_fkey" FOREIGN KEY ("hrReviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResignationEvent" ADD CONSTRAINT "ResignationEvent_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "Resignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
