CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Shift',
    "notes" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftAssignment_companyId_startAt_idx" ON "ShiftAssignment"("companyId", "startAt");
CREATE INDEX "ShiftAssignment_employeeId_startAt_idx" ON "ShiftAssignment"("employeeId", "startAt");

ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
