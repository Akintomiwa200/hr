-- Base salary is the employee's full configured salary by default.
-- Keep the setting available so companies can opt into proration later.
ALTER TABLE "PayrollSettings"
  ALTER COLUMN "proRataSalaryEnabled" SET DEFAULT false;

ALTER TABLE "PayrollSettings"
  ADD COLUMN IF NOT EXISTS "latenessDeductionEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "absenceDeductionEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "taxEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "PayrollSettings"
SET "proRataSalaryEnabled" = false
WHERE "proRataSalaryEnabled" = true;
