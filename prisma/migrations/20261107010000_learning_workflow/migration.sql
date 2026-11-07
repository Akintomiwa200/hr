-- Extend the learning module into a full authoring + delivery workflow.
ALTER TABLE "LearningCourse"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "objectives" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "level" TEXT,
  ADD COLUMN "format" TEXT NOT NULL DEFAULT 'SELF_PACED',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "tags" TEXT,
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "passingScore" INTEGER,
  ADD COLUMN "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Courses created before this workflow shipped were already visible to staff.
UPDATE "LearningCourse"
SET "status" = 'PUBLISHED',
    "publishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "isActive" = true;

ALTER TABLE "LearningAssignment"
  ADD COLUMN "pathId" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ASSIGNED',
  ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "score" INTEGER,
  ADD COLUMN "feedback" TEXT;

CREATE TABLE "LearningModule" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningLesson" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'READING',
  "content" TEXT,
  "url" TEXT,
  "durationMinutes" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "quiz" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningPath" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "level" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningPathCourse" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "pathId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPathCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "score" INTEGER,
  "timeSpentMinutes" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "provider" TEXT,
  "url" TEXT,
  "cost" DOUBLE PRECISION,
  "currency" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "justification" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseFeedback" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "employeeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningCourse_companyId_status_idx" ON "LearningCourse"("companyId", "status");
CREATE INDEX "LearningModule_courseId_position_idx" ON "LearningModule"("courseId", "position");
CREATE INDEX "LearningLesson_moduleId_position_idx" ON "LearningLesson"("moduleId", "position");
CREATE INDEX "LearningPath_companyId_isActive_idx" ON "LearningPath"("companyId", "isActive");
CREATE UNIQUE INDEX "LearningPathCourse_pathId_courseId_key" ON "LearningPathCourse"("pathId", "courseId");
CREATE INDEX "LearningPathCourse_pathId_position_idx" ON "LearningPathCourse"("pathId", "position");
CREATE UNIQUE INDEX "LessonProgress_assignmentId_lessonId_key" ON "LessonProgress"("assignmentId", "lessonId");
CREATE INDEX "LessonProgress_companyId_lessonId_idx" ON "LessonProgress"("companyId", "lessonId");
CREATE INDEX "TrainingRequest_companyId_status_idx" ON "TrainingRequest"("companyId", "status");
CREATE INDEX "TrainingRequest_companyId_employeeId_idx" ON "TrainingRequest"("companyId", "employeeId");
CREATE INDEX "CourseFeedback_companyId_courseId_idx" ON "CourseFeedback"("companyId", "courseId");
CREATE UNIQUE INDEX "CourseFeedback_assignmentId_key" ON "CourseFeedback"("assignmentId");
CREATE INDEX "LearningAssignment_companyId_pathId_idx" ON "LearningAssignment"("companyId", "pathId");

ALTER TABLE "LearningCourse" ADD CONSTRAINT "LearningCourse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningLesson" ADD CONSTRAINT "LearningLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningPathCourse" ADD CONSTRAINT "LearningPathCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LearningAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingRequest" ADD CONSTRAINT "TrainingRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingRequest" ADD CONSTRAINT "TrainingRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingRequest" ADD CONSTRAINT "TrainingRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LearningAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFeedback" ADD CONSTRAINT "CourseFeedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssignment" ADD CONSTRAINT "LearningAssignment_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;
