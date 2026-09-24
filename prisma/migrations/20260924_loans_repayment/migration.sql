-- CreateTable Loan
CREATE TABLE IF NOT EXISTS "Loan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyInstallment" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "startMonth" TEXT NOT NULL,
    "totalRepayable" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Loan_companyId_status_idx" ON "Loan"("companyId", "status");
CREATE INDEX IF NOT EXISTS "Loan_employeeId_status_idx" ON "Loan"("employeeId", "status");

DO $$ BEGIN
  ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Loan" ADD CONSTRAINT "Loan_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable LoanInstallment
CREATE TABLE IF NOT EXISTS "LoanInstallment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "deductionId" TEXT,
    "appliedPayrollId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoanInstallment_loanId_seq_key" ON "LoanInstallment"("loanId", "seq");
CREATE INDEX IF NOT EXISTS "LoanInstallment_loanId_idx" ON "LoanInstallment"("loanId");
CREATE INDEX IF NOT EXISTS "LoanInstallment_month_status_idx" ON "LoanInstallment"("month", "status");
CREATE INDEX IF NOT EXISTS "LoanInstallment_deductionId_idx" ON "LoanInstallment"("deductionId");

DO $$ BEGIN
  ALTER TABLE "LoanInstallment" ADD CONSTRAINT "LoanInstallment_loanId_fkey"
    FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable PayrollDeduction
ALTER TABLE "PayrollDeduction" ADD COLUMN IF NOT EXISTS "loanId" TEXT;
ALTER TABLE "PayrollDeduction" ADD COLUMN IF NOT EXISTS "loanInstallmentId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollDeduction_loanId_idx" ON "PayrollDeduction"("loanId");
CREATE INDEX IF NOT EXISTS "PayrollDeduction_loanInstallmentId_idx" ON "PayrollDeduction"("loanInstallmentId");