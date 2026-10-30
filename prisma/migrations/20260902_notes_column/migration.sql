-- Notes were introduced in a later migration with the same date. Create the
-- base table here when it does not exist so a fresh shadow database can apply
-- the column and folder migrations in order. Existing installations keep their
-- data because the table creation is conditional.
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'violet',
    "scope" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "column" TEXT NOT NULL DEFAULT 'TODO';
