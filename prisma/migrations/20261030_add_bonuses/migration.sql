-- Company-wide configuration for the Bonuses module.
CREATE TABLE "BonusSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "payrollLineLabel" TEXT NOT NULL DEFAULT 'Bonus',
    "payoutSchedule" TEXT NOT NULL DEFAULT 'MANUAL',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approverRole" TEXT NOT NULL DEFAULT 'HR',
    "requireReason" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfNomination" BOOLEAN NOT NULL DEFAULT false,
    "allowManagerNomination" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmployee" BOOLEAN NOT NULL DEFAULT true,
    "notifyApprover" BOOLEAN NOT NULL DEFAULT true,
    "autoApplyToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "minServiceMonths" INTEGER NOT NULL DEFAULT 0,
    "maxAwardAmount" DOUBLE PRECISION,
    "maxPercentOfSalary" DOUBLE PRECISION,
    "prorateOnLeave" BOOLEAN NOT NULL DEFAULT false,
    "defaultTypeId" TEXT,
    "eligibility" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BonusSettings_companyId_key" ON "BonusSettings"("companyId");

-- Reusable bonus plans/types.
CREATE TABLE "BonusType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'PERFORMANCE',
    "calculationMethod" TEXT NOT NULL DEFAULT 'FIXED',
    "defaultAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "base" TEXT NOT NULL DEFAULT 'BASE_SALARY',
    "maxAmount" DOUBLE PRECISION,
    "minServiceMonths" INTEGER NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BonusType_companyId_isActive_idx" ON "BonusType"("companyId", "isActive");

-- Individual bonus awards and their payout lifecycle.
CREATE TABLE "BonusAward" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "typeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'PERFORMANCE',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "calculationMethod" TEXT NOT NULL DEFAULT 'MANUAL',
    "baseAmount" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "awardDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "payrollRecordId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusAward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BonusAward_companyId_status_idx" ON "BonusAward"("companyId", "status");
CREATE INDEX "BonusAward_employeeId_status_idx" ON "BonusAward"("employeeId", "status");
CREATE INDEX "BonusAward_awardDate_idx" ON "BonusAward"("awardDate");
CREATE INDEX "BonusAward_typeId_idx" ON "BonusAward"("typeId");

ALTER TABLE "BonusSettings" ADD CONSTRAINT "BonusSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BonusType" ADD CONSTRAINT "BonusType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BonusAward" ADD CONSTRAINT "BonusAward_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BonusAward" ADD CONSTRAINT "BonusAward_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BonusAward" ADD CONSTRAINT "BonusAward_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "BonusType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BonusAward" ADD CONSTRAINT "BonusAward_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
