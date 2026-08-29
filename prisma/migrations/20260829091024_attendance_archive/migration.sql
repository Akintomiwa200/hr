-- CreateTable
CREATE TABLE "AttendanceArchive" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "month" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "restored" BOOLEAN NOT NULL DEFAULT false,
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceArchive_companyId_createdAt_idx" ON "AttendanceArchive"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceArchive_companyId_month_key" ON "AttendanceArchive"("companyId", "month");

-- AddForeignKey
ALTER TABLE "AttendanceArchive" ADD CONSTRAINT "AttendanceArchive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
