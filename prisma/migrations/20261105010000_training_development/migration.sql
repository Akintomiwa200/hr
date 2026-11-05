CREATE TABLE "LearningCourse" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "provider" TEXT,
  "url" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LearningAssignment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DevelopmentRecord" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "level" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StaffChangeRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "currentValue" TEXT,
  "proposedValue" TEXT,
  "rationale" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningCourse_companyId_isActive_idx" ON "LearningCourse"("companyId", "isActive");
CREATE UNIQUE INDEX "LearningAssignment_courseId_employeeId_key" ON "LearningAssignment"("courseId", "employeeId");
CREATE INDEX "LearningAssignment_companyId_employeeId_status_idx" ON "LearningAssignment"("companyId", "employeeId", "status");
CREATE INDEX "DevelopmentRecord_companyId_employeeId_type_idx" ON "DevelopmentRecord"("companyId", "employeeId", "type");
CREATE INDEX "StaffChangeRequest_companyId_employeeId_status_idx" ON "StaffChangeRequest"("companyId", "employeeId", "status");
ALTER TABLE "LearningCourse" ADD CONSTRAINT "LearningCourse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DevelopmentRecord" ADD CONSTRAINT "DevelopmentRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentRecord" ADD CONSTRAINT "DevelopmentRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT "StaffChangeRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT "StaffChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffChangeRequest" ADD CONSTRAINT "StaffChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "PeerFeedbackRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "subjectEmployeeId" TEXT NOT NULL,
  "reviewerEmployeeId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "rating" INTEGER,
  "feedback" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerFeedbackRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerFeedbackRequest_cycleId_subjectEmployeeId_reviewerEmployeeId_key" ON "PeerFeedbackRequest"("cycleId", "subjectEmployeeId", "reviewerEmployeeId");
CREATE INDEX "PeerFeedbackRequest_companyId_reviewerEmployeeId_status_idx" ON "PeerFeedbackRequest"("companyId", "reviewerEmployeeId", "status");
CREATE INDEX "PeerFeedbackRequest_companyId_subjectEmployeeId_idx" ON "PeerFeedbackRequest"("companyId", "subjectEmployeeId");
ALTER TABLE "PeerFeedbackRequest" ADD CONSTRAINT "PeerFeedbackRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerFeedbackRequest" ADD CONSTRAINT "PeerFeedbackRequest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerFeedbackRequest" ADD CONSTRAINT "PeerFeedbackRequest_subjectEmployeeId_fkey" FOREIGN KEY ("subjectEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerFeedbackRequest" ADD CONSTRAINT "PeerFeedbackRequest_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
