-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME';

-- Backfill from legacy title markers (no seed-code coupling)
UPDATE "Employee"
SET "employmentType" = 'FREELANCE'
WHERE LOWER("jobTitle") LIKE '%freelance%'
   OR LOWER("jobTitle") LIKE '%contract%';

-- Keep job titles clean; employment type lives in its own column
UPDATE "Employee"
SET "jobTitle" = TRIM(REGEXP_REPLACE("jobTitle", '\s*\(Freelance\)', '', 'gi'))
WHERE "jobTitle" ~* '\(Freelance\)';
