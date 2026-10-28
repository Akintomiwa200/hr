-- Manager daily reporting workspace (blank/template documents + history).
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "template" TEXT NOT NULL DEFAULT 'blank',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DailyReport_userId_reportDate_idx" ON "DailyReport"("userId", "reportDate");
CREATE INDEX "DailyReport_userId_updatedAt_idx" ON "DailyReport"("userId", "updatedAt");
CREATE INDEX "DailyReport_companyId_status_idx" ON "DailyReport"("companyId", "status");

ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
