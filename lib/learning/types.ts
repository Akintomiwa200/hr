export type LearningEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: { name: string } | null;
};

export type LearningCourse = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  objectives: string | null;
  category: string | null;
  level: string | null;
  format: string;
  status: string;
  provider: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  tags: string | null;
  durationMinutes: number | null;
  passingScore: number | null;
  certificateEnabled: boolean;
  publishedAt: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    assignments?: number;
    modules?: number;
    pathCourses?: number;
  };
};

export type LearningLesson = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  type: string;
  content: string | null;
  url: string | null;
  durationMinutes: number | null;
  position: number;
  isPreview: boolean;
  quiz: unknown;
  progress?: LearningLessonProgress | null;
};

export type LearningModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LearningLesson[];
};

export type LearningPathCourse = {
  id: string;
  pathId: string;
  courseId: string;
  position: number;
  course: LearningCourse;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  courses?: LearningPathCourse[];
  _count?: { courses?: number; assignments?: number };
};

export type LearningLessonProgress = {
  id: string;
  assignmentId: string;
  lessonId: string;
  status: string;
  score: number | null;
  timeSpentMinutes: number | null;
  completedAt: string | null;
};

export type LearningAssignment = {
  id: string;
  courseId: string;
  employeeId: string;
  pathId: string | null;
  source: string;
  dueDate: string | null;
  status: string;
  progressPercent: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  completedAt: string | null;
  score: number | null;
  feedback: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  course: LearningCourse;
  employee: LearningEmployee;
  path?: { id: string; title: string } | null;
  lessonProgress?: LearningLessonProgress[];
};

export type DevelopmentRecord = {
  id: string;
  type: string;
  title: string;
  level: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  employee: LearningEmployee;
};

export type TrainingRequest = {
  id: string;
  title: string;
  provider: string | null;
  url: string | null;
  cost: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  justification: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  employee: LearningEmployee;
  reviewer?: LearningEmployee | null;
};

export type CourseFeedback = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  employee: LearningEmployee;
};

export type LearningAccessInfo = {
  companyId: string | null;
  employeeId: string | null;
  role: string;
  isCreator: boolean;
  isManager: boolean;
  isSelfService: boolean;
};

export type LearningStats = {
  courses: number;
  publishedCourses: number;
  draftCourses: number;
  assignments: number;
  completed: number;
  inProgress: number;
  overdue: number;
  learners: number;
  completionRate: number;
  pendingRequests: number;
  skills: number;
  certifications: number;
  paths: number;
};

export type LearningWorkspace = {
  courses: LearningCourse[];
  assignments: LearningAssignment[];
  paths: LearningPath[];
  records: DevelopmentRecord[];
  requests: TrainingRequest[];
  employees: LearningEmployee[];
  access: LearningAccessInfo;
  stats: LearningStats;
};

export type LearningCourseDetail = {
  course: LearningCourse & { modules: LearningModule[] };
  assignment: LearningAssignment | null;
  assignments: LearningAssignment[];
  feedback: CourseFeedback[];
  access: LearningAccessInfo;
};

export type LearningAnalytics = {
  totals: {
    learners: number;
    assignments: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    averageScore: number | null;
    feedbackAverage: number | null;
    trainingHours: number;
  };
  byCourse: Array<{
    courseId: string;
    title: string;
    assignments: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    averageProgress: number;
  }>;
  byDepartment: Array<{
    department: string;
    assignments: number;
    completed: number;
    completionRate: number;
  }>;
  byStatus: Array<{ status: string; count: number }>;
  recentCompletions: Array<{
    id: string;
    employee: string;
    course: string;
    completedAt: string | null;
  }>;
};
