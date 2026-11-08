import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import {
  requireSession,
  unauthorized,
  badRequest,
  forbidden,
  notFound,
} from "@/lib/api-auth";
import { getCompanyScope } from "@/lib/company-scope";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  getLearningAccess,
  learningAssignmentWhere,
  learningCourseWhere,
  learningEmployeeWhere,
  learningRequestWhere,
} from "@/lib/learning/access";
import { syncAssignmentProgress } from "@/lib/learning/progress";

const COURSE_STATUSES = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const LESSON_TYPES = new Set(["READING", "VIDEO", "QUIZ", "ASSIGNMENT", "LIVE"]);
const REQUEST_STATUSES = new Set(["APPROVED", "REJECTED", "CANCELLED"]);
const ASSIGNMENT_STATUSES = new Set([
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function integer(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function money(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function quizInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function employeeSelect() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    employeeCode: true,
    department: { select: { name: true } },
  } as const;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const access = getLearningAccess(session);
  const empty = {
    courses: [],
    assignments: [],
    paths: [],
    records: [],
    requests: [],
    employees: [],
    access,
    stats: {
      courses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      assignments: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      learners: 0,
      completionRate: 0,
      pendingRequests: 0,
      skills: 0,
      certifications: 0,
      paths: 0,
    },
  };
  if (!access.companyId) return NextResponse.json(empty);

  const scope = getCompanyScope(session);
  const companyId = access.companyId;
  const employeeWhere = learningEmployeeWhere(session);
  const recordWhere = access.isCreator
    ? { companyId }
    : { companyId, employee: employeeWhere };

  try {
    const [courses, assignments, paths, records, requests, employees] =
      await withPrismaRetry(() =>
        Promise.all([
          prisma.learningCourse.findMany({
            where: learningCourseWhere(session),
            include: {
              _count: {
                select: { assignments: true, modules: true, pathCourses: true },
              },
            },
            orderBy: [{ updatedAt: "desc" }],
          }),
          prisma.learningAssignment.findMany({
            where: learningAssignmentWhere(session),
            include: {
              course: true,
              employee: { select: employeeSelect() },
              path: { select: { id: true, title: true } },
              lessonProgress: {
                select: {
                  id: true,
                  assignmentId: true,
                  lessonId: true,
                  status: true,
                  score: true,
                  timeSpentMinutes: true,
                  completedAt: true,
                },
              },
            },
            orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          }),
          prisma.learningPath.findMany({
            where: access.isCreator
              ? { companyId }
              : { companyId, isActive: true },
            include: {
              courses: {
                include: { course: true },
                orderBy: { position: "asc" },
              },
              _count: { select: { assignments: true } },
            },
            orderBy: { title: "asc" },
          }),
          prisma.developmentRecord.findMany({
            where: recordWhere,
            include: { employee: { select: employeeSelect() } },
            orderBy: { updatedAt: "desc" },
          }),
          prisma.trainingRequest.findMany({
            where: learningRequestWhere(session),
            include: {
              employee: { select: employeeSelect() },
              reviewer: { select: employeeSelect() },
            },
            orderBy: { createdAt: "desc" },
          }),
          access.isManager
            ? prisma.employee.findMany({
                where: employeeWhere,
                select: employeeSelect(),
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
              })
            : Promise.resolve([]),
        ])
      );

    const now = Date.now();
    const completed = assignments.filter(
      (item) => item.status === "COMPLETED"
    ).length;
    const inProgress = assignments.filter(
      (item) => item.status === "IN_PROGRESS"
    ).length;
    const overdue = assignments.filter(
      (item) =>
        item.status !== "COMPLETED" &&
        item.dueDate &&
        new Date(item.dueDate).getTime() < now
    ).length;
    const learners = new Set(assignments.map((item) => item.employeeId)).size;
    const stats = {
      courses: courses.length,
      publishedCourses: courses.filter((item) => item.status === "PUBLISHED")
        .length,
      draftCourses: courses.filter((item) => item.status === "DRAFT").length,
      assignments: assignments.length,
      completed,
      inProgress,
      overdue,
      learners,
      completionRate:
        assignments.length > 0
          ? Math.round((completed / assignments.length) * 100)
          : 0,
      pendingRequests: requests.filter((item) => item.status === "PENDING")
        .length,
      skills: records.filter((item) => item.type === "SKILL").length,
      certifications: records.filter((item) => item.type === "CERTIFICATION")
        .length,
      paths: paths.length,
    };

    return NextResponse.json({
      courses,
      assignments,
      paths,
      records,
      requests,
      employees,
      access,
      stats,
      employeeScope: scope.isPlatformAdmin ? "platform" : "company",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    console.error("Training data load failed", { code, message });
    if (code === "P2021" || /does not exist|relation .* missing/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "The learning tables are not installed in this database yet. Run the project database sync, then retry.",
          code: "TRAINING_SCHEMA_MISSING",
        },
        { status: 503 }
      );
    }
    if (/cannot read properties of undefined|undefined.*findmany/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "The app server is still using an older database client. Restart the app server, then retry.",
          code: "TRAINING_CLIENT_STALE",
        },
        { status: 503 }
      );
    }
    if (
      ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code) ||
      /connection|timeout|econnreset/i.test(message)
    ) {
      return NextResponse.json(
        {
          error:
            "The learning database could not be reached. Check the database connection and retry.",
          code: "TRAINING_DATABASE_UNREACHABLE",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Training data could not be read. Retry, and contact support if this continues.",
        code: "TRAINING_QUERY_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const access = getLearningAccess(session);
  if (!access.companyId) return forbidden();
  const companyId = access.companyId;
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");

  try {
    if (action.startsWith("course.")) {
      if (!access.isCreator) return forbidden();
      return await handleCourseAction(action, body, companyId, session.employeeId ?? null);
    }

    if (action === "lesson.progress") {
      return await handleLessonProgress(session, body, companyId);
    }

    if (action.startsWith("module.") || action.startsWith("lesson.")) {
      if (!access.isCreator) return forbidden();
      return await handleContentAction(action, body, companyId);
    }

    if (action === "path.enroll") {
      return await handlePathEnroll(session, body, companyId);
    }

    if (action.startsWith("path.")) {
      if (!access.isCreator) return forbidden();
      return await handlePathAction(action, body, companyId);
    }

    if (action === "assignment.create" || action === "assignment.bulk") {
      if (!access.isManager) return forbidden();
      return await handleAssignmentCreate(session, body, companyId);
    }

    if (action === "assignment.update") {
      return await handleAssignmentUpdate(session, body, companyId);
    }

    if (action === "assignment.delete" || action === "assignment.reset") {
      if (!access.isManager) return forbidden();
      return await handleAssignmentManage(session, action, body, companyId);
    }

    if (action === "enroll") {
      return await handleEnroll(session, body, companyId);
    }

    if (action === "record.create" || action === "record.delete") {
      return await handleRecordAction(session, action, body, companyId);
    }

    if (action === "request.create") {
      return await handleRequestCreate(session, body, companyId);
    }

    if (action === "request.review") {
      return await handleRequestReview(session, body, companyId);
    }

    if (action === "feedback.create") {
      return await handleFeedback(session, body, companyId);
    }

    return badRequest("Unknown training action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Training action ${action} failed`, message);
    return NextResponse.json(
      { error: "The learning change could not be saved. Retry and try again." },
      { status: 500 }
    );
  }
}

async function handleCourseAction(
  action: string,
  body: Record<string, unknown>,
  companyId: string,
  employeeId: string | null
) {
  if (action === "course.create") {
    const title = text(body.title);
    if (!title) return badRequest("Course title is required.");
    const status =
      typeof body.status === "string" && COURSE_STATUSES.has(body.status)
        ? body.status
        : "DRAFT";
    const course = await prisma.learningCourse.create({
      data: {
        companyId,
        title,
        code: text(body.code),
        description: text(body.description),
        objectives: text(body.objectives),
        category: text(body.category),
        level: text(body.level),
        format: text(body.format) ?? "SELF_PACED",
        status,
        provider: text(body.provider),
        url: text(body.url),
        thumbnailUrl: text(body.thumbnailUrl),
        tags: text(body.tags),
        durationMinutes: integer(body.durationMinutes),
        passingScore: integer(body.passingScore),
        certificateEnabled: Boolean(body.certificateEnabled),
        createdById: employeeId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        isActive: status !== "ARCHIVED",
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "course_created",
      id: course.id,
    });
    return NextResponse.json(course, { status: 201 });
  }

  const courseId = String(body.courseId ?? body.id ?? "");
  const course = await prisma.learningCourse.findFirst({
    where: { id: courseId, companyId },
  });
  if (!course) return notFound();

  if (action === "course.update") {
    const status =
      typeof body.status === "string" && COURSE_STATUSES.has(body.status)
        ? body.status
        : undefined;
    const updated = await prisma.learningCourse.update({
      where: { id: course.id },
      data: {
        title: body.title === undefined ? undefined : text(body.title) ?? course.title,
        code: body.code === undefined ? undefined : text(body.code),
        description:
          body.description === undefined ? undefined : text(body.description),
        objectives:
          body.objectives === undefined ? undefined : text(body.objectives),
        category: body.category === undefined ? undefined : text(body.category),
        level: body.level === undefined ? undefined : text(body.level),
        format: body.format === undefined ? undefined : text(body.format) ?? course.format,
        status,
        provider: body.provider === undefined ? undefined : text(body.provider),
        url: body.url === undefined ? undefined : text(body.url),
        thumbnailUrl:
          body.thumbnailUrl === undefined
            ? undefined
            : text(body.thumbnailUrl),
        tags: body.tags === undefined ? undefined : text(body.tags),
        durationMinutes:
          body.durationMinutes === undefined
            ? undefined
            : integer(body.durationMinutes),
        passingScore:
          body.passingScore === undefined
            ? undefined
            : integer(body.passingScore),
        certificateEnabled:
          body.certificateEnabled === undefined
            ? undefined
            : Boolean(body.certificateEnabled),
        isActive:
          body.isActive === undefined ? undefined : Boolean(body.isActive),
        publishedAt:
          status === "PUBLISHED"
            ? course.publishedAt ?? new Date()
            : status === "DRAFT"
              ? null
              : undefined,
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "course_updated",
      id: updated.id,
    });
    return NextResponse.json(updated);
  }

  if (action === "course.archive" || action === "course.delete") {
    const updated = await prisma.learningCourse.update({
      where: { id: course.id },
      data: { isActive: false, status: "ARCHIVED" },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "course_archived",
      id: updated.id,
    });
    return NextResponse.json(updated);
  }

  if (action === "course.restore") {
    const updated = await prisma.learningCourse.update({
      where: { id: course.id },
      data: {
        isActive: true,
        status: course.publishedAt ? "PUBLISHED" : "DRAFT",
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "course_restored",
      id: updated.id,
    });
    return NextResponse.json(updated);
  }

  return badRequest("Unknown course action.");
}

async function handleContentAction(
  action: string,
  body: Record<string, unknown>,
  companyId: string
) {
  if (action === "module.create") {
    const courseId = String(body.courseId ?? "");
    const course = await prisma.learningCourse.findFirst({
      where: { id: courseId, companyId },
      include: { _count: { select: { modules: true } } },
    });
    if (!course) return notFound();
    const title = text(body.title);
    if (!title) return badRequest("Module title is required.");
    const learningModule = await prisma.learningModule.create({
      data: {
        companyId,
        courseId,
        title,
        description: text(body.description),
        position: integer(body.position) ?? course._count.modules,
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "module_created",
      id: learningModule.id,
      courseId,
    });
    return NextResponse.json(learningModule, { status: 201 });
  }

  if (action === "lesson.create") {
    const moduleId = String(body.moduleId ?? "");
    const learningModule = await prisma.learningModule.findFirst({
      where: { id: moduleId, companyId },
      include: { _count: { select: { lessons: true } } },
    });
    if (!learningModule) return notFound();
    const title = text(body.title);
    if (!title) return badRequest("Lesson title is required.");
    const type =
      typeof body.type === "string" && LESSON_TYPES.has(body.type)
        ? body.type
        : "READING";
    const lesson = await prisma.learningLesson.create({
      data: {
        companyId,
        moduleId,
        title,
        description: text(body.description),
        type,
        content: text(body.content),
        url: text(body.url),
        durationMinutes: integer(body.durationMinutes),
        position: integer(body.position) ?? learningModule._count.lessons,
        isPreview: Boolean(body.isPreview),
        quiz: quizInput(body.quiz),
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "lesson_created",
      id: lesson.id,
      courseId: learningModule.courseId,
    });
    return NextResponse.json(lesson, { status: 201 });
  }

  if (action === "module.update" || action === "module.delete") {
    const moduleId = String(body.moduleId ?? body.id ?? "");
    const learningModule = await prisma.learningModule.findFirst({
      where: { id: moduleId, companyId },
    });
    if (!learningModule) return notFound();
    if (action === "module.delete") {
      await prisma.learningModule.delete({ where: { id: learningModule.id } });
      broadcastAppEvent("training_updated", {
        companyId,
        action: "module_deleted",
        id: learningModule.id,
        courseId: learningModule.courseId,
      });
      return NextResponse.json({ ok: true });
    }
    const updated = await prisma.learningModule.update({
      where: { id: learningModule.id },
      data: {
        title: body.title === undefined ? undefined : text(body.title) ?? learningModule.title,
        description:
          body.description === undefined ? undefined : text(body.description),
        position:
          body.position === undefined
            ? undefined
            : integer(body.position) ?? learningModule.position,
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "module_updated",
      id: updated.id,
      courseId: updated.courseId,
    });
    return NextResponse.json(updated);
  }

  if (action === "lesson.update" || action === "lesson.delete") {
    const lessonId = String(body.lessonId ?? body.id ?? "");
    const lesson = await prisma.learningLesson.findFirst({
      where: { id: lessonId, companyId },
      include: { module: true },
    });
    if (!lesson) return notFound();
    if (action === "lesson.delete") {
      await prisma.learningLesson.delete({ where: { id: lesson.id } });
      broadcastAppEvent("training_updated", {
        companyId,
        action: "lesson_deleted",
        id: lesson.id,
        courseId: lesson.module.courseId,
      });
      return NextResponse.json({ ok: true });
    }
    const type =
      typeof body.type === "string" && LESSON_TYPES.has(body.type)
        ? body.type
        : undefined;
    const updated = await prisma.learningLesson.update({
      where: { id: lesson.id },
      data: {
        title: body.title === undefined ? undefined : text(body.title) ?? lesson.title,
        description:
          body.description === undefined ? undefined : text(body.description),
        type,
        content: body.content === undefined ? undefined : text(body.content),
        url: body.url === undefined ? undefined : text(body.url),
        durationMinutes:
          body.durationMinutes === undefined
            ? undefined
            : integer(body.durationMinutes),
        position:
          body.position === undefined
            ? undefined
            : integer(body.position) ?? lesson.position,
        isPreview:
          body.isPreview === undefined ? undefined : Boolean(body.isPreview),
        quiz: quizInput(body.quiz),
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "lesson_updated",
      id: updated.id,
      courseId: lesson.module.courseId,
    });
    return NextResponse.json(updated);
  }

  return badRequest("Unknown content action.");
}

async function handlePathAction(
  action: string,
  body: Record<string, unknown>,
  companyId: string
) {
  if (action === "path.create") {
    const title = text(body.title);
    if (!title) return badRequest("Path title is required.");
    const path = await prisma.learningPath.create({
      data: {
        companyId,
        title,
        description: text(body.description),
        level: text(body.level),
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_created",
      id: path.id,
    });
    return NextResponse.json(path, { status: 201 });
  }

  const pathId = String(body.pathId ?? body.id ?? "");
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, companyId },
  });
  if (!path) return notFound();

  if (action === "path.update") {
    const updated = await prisma.learningPath.update({
      where: { id: path.id },
      data: {
        title: body.title === undefined ? undefined : text(body.title) ?? path.title,
        description:
          body.description === undefined ? undefined : text(body.description),
        level: body.level === undefined ? undefined : text(body.level),
        isActive:
          body.isActive === undefined ? undefined : Boolean(body.isActive),
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_updated",
      id: updated.id,
    });
    return NextResponse.json(updated);
  }

  if (action === "path.delete") {
    await prisma.learningPath.delete({ where: { id: path.id } });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_deleted",
      id: path.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "path.course.add") {
    const courseId = String(body.courseId ?? "");
    const course = await prisma.learningCourse.findFirst({
      where: { id: courseId, companyId },
    });
    if (!course) return notFound();
    const existing = await prisma.learningPathCourse.findUnique({
      where: { pathId_courseId: { pathId: path.id, courseId } },
    });
    if (existing) return NextResponse.json(existing);
    const count = await prisma.learningPathCourse.count({
      where: { pathId: path.id },
    });
    const link = await prisma.learningPathCourse.create({
      data: {
        companyId,
        pathId: path.id,
        courseId,
        position: integer(body.position) ?? count,
      },
    });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_course_added",
      id: link.id,
      pathId: path.id,
    });
    return NextResponse.json(link, { status: 201 });
  }

  if (action === "path.course.remove") {
    const linkId = String(body.linkId ?? "");
    const link = await prisma.learningPathCourse.findFirst({
      where: {
        companyId,
        pathId: path.id,
        ...(linkId ? { id: linkId } : { courseId: String(body.courseId ?? "") }),
      },
    });
    if (!link) return notFound();
    await prisma.learningPathCourse.delete({ where: { id: link.id } });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_course_removed",
      id: link.id,
      pathId: path.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "path.course.move") {
    const linkId = String(body.linkId ?? "");
    const direction = body.direction === "up" ? -1 : 1;
    const links = await prisma.learningPathCourse.findMany({
      where: { pathId: path.id },
      orderBy: { position: "asc" },
    });
    const index = links.findIndex((item) => item.id === linkId);
    const current = links[index];
    const target = links[index + direction];
    if (!current || !target) return NextResponse.json({ ok: true });
    await prisma.$transaction([
      prisma.learningPathCourse.update({
        where: { id: current.id },
        data: { position: target.position },
      }),
      prisma.learningPathCourse.update({
        where: { id: target.id },
        data: { position: current.position },
      }),
    ]);
    broadcastAppEvent("training_updated", {
      companyId,
      action: "path_course_moved",
      id: current.id,
      pathId: path.id,
    });
    return NextResponse.json({ ok: true });
  }

  return badRequest("Unknown path action.");
}

async function handlePathEnroll(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  if (!session.employeeId) {
    return badRequest("Your account needs an employee profile before enrolling.");
  }
  const pathId = String(body.pathId ?? "");
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, companyId, isActive: true },
    include: {
      courses: {
        orderBy: { position: "asc" },
        include: {
          course: {
            select: { id: true, status: true, isActive: true },
          },
        },
      },
    },
  });
  if (!path) return notFound();

  const published = path.courses
    .map((item) => item.course)
    .filter((course) => course.status === "PUBLISHED" && course.isActive);
  if (published.length === 0) {
    return badRequest("This path has no published courses yet.");
  }

  await Promise.all(
    published.map((course) =>
      prisma.learningAssignment.upsert({
        where: {
          courseId_employeeId: {
            courseId: course.id,
            employeeId: session.employeeId!,
          },
        },
        create: {
          companyId,
          courseId: course.id,
          employeeId: session.employeeId!,
          assignedById: session.employeeId!,
          pathId: path.id,
          source: "SELF",
        },
        update: {},
      })
    )
  );

  broadcastAppEvent("training_updated", {
    companyId,
    action: "path_enrolled",
    id: path.id,
    count: published.length,
  });
  return NextResponse.json({ ok: true, count: published.length });
}

async function handleAssignmentCreate(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  if (!session.employeeId) {
    return badRequest("Your account needs an employee profile before it can assign training.");
  }

  const employeeIds = Array.isArray(body.employeeIds)
    ? body.employeeIds.map(String).filter(Boolean)
    : body.employeeId
      ? [String(body.employeeId)]
      : [];
  if (employeeIds.length === 0) return badRequest("Choose at least one employee.");

  const pathId = text(body.pathId);
  let courseIds = Array.isArray(body.courseIds)
    ? body.courseIds.map(String).filter(Boolean)
    : body.courseId
      ? [String(body.courseId)]
      : [];

  if (pathId) {
    const path = await prisma.learningPath.findFirst({
      where: { id: pathId, companyId },
      include: { courses: { orderBy: { position: "asc" } } },
    });
    if (!path) return badRequest("That learning path was not found.");
    courseIds = path.courses.map((item) => item.courseId);
  }
  courseIds = [...new Set(courseIds)];
  if (courseIds.length === 0) return badRequest("Choose at least one course.");

  const [courses, employees] = await Promise.all([
    prisma.learningCourse.findMany({
      where: { id: { in: courseIds }, companyId, isActive: true },
      select: { id: true },
    }),
    prisma.employee.findMany({
      where: { id: { in: employeeIds }, ...learningEmployeeWhere(session) },
      select: { id: true },
    }),
  ]);
  if (courses.length !== courseIds.length) {
    return badRequest("One or more courses are not available in this company.");
  }
  if (employees.length === 0) {
    return badRequest("Choose employees you are allowed to manage.");
  }

  const dueDate = dateOrNull(body.dueDate);
  const source = text(body.source) ?? "ASSIGNED";
  const notes = text(body.notes);
  const created = await Promise.all(
    courses.flatMap((course) =>
      employees.map((employee) =>
        prisma.learningAssignment.upsert({
          where: {
            courseId_employeeId: {
              courseId: course.id,
              employeeId: employee.id,
            },
          },
          create: {
            companyId,
            courseId: course.id,
            employeeId: employee.id,
            assignedById: session.employeeId!,
            pathId,
            source,
            dueDate,
            notes,
          },
          update: {
            assignedById: session.employeeId!,
            pathId,
            source,
            dueDate,
            notes,
            status: "ASSIGNED",
            progressPercent: 0,
            startedAt: null,
            completedAt: null,
            lastActivityAt: null,
          },
          include: { course: true, employee: { select: employeeSelect() } },
        })
      )
    )
  );

  broadcastAppEvent("training_updated", {
    companyId,
    action: "assignment_created",
    count: created.length,
  });
  return NextResponse.json({ assignments: created, count: created.length }, { status: 201 });
}

async function handleAssignmentUpdate(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  const assignmentId = String(body.assignmentId ?? body.id ?? "");
  const assignment = await prisma.learningAssignment.findFirst({
    where: { id: assignmentId, companyId },
  });
  if (!assignment) return notFound();

  const access = getLearningAccess(session);
  const isOwner = assignment.employeeId === session.employeeId;
  let canManage = access.isCreator || isOwner;
  if (!canManage && access.isManager && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: {
        id: assignment.employeeId,
        managerId: session.employeeId,
        user: { companyId },
      },
      select: { id: true },
    });
    canManage = Boolean(report);
  }
  if (!isOwner && !canManage) return forbidden();

  const status =
    typeof body.status === "string" && ASSIGNMENT_STATUSES.has(body.status)
      ? body.status
      : undefined;

  const updated = await prisma.learningAssignment.update({
    where: { id: assignment.id },
    data: {
      status,
      dueDate: canManage ? dateOrNull(body.dueDate) : undefined,
      feedback: canManage && body.feedback !== undefined ? text(body.feedback) : undefined,
      score: canManage && body.score !== undefined ? integer(body.score) : undefined,
      notes: body.notes === undefined ? undefined : text(body.notes),
      completedAt:
        status === "COMPLETED"
          ? assignment.completedAt ?? new Date()
          : status
            ? null
            : undefined,
      progressPercent:
        status === "COMPLETED"
          ? 100
          : status === "ASSIGNED"
            ? 0
            : undefined,
      startedAt:
        status === "IN_PROGRESS" || status === "COMPLETED"
          ? assignment.startedAt ?? new Date()
          : status
            ? null
            : undefined,
      lastActivityAt: new Date(),
    },
    include: { course: true, employee: { select: employeeSelect() } },
  });

  broadcastAppEvent("training_updated", {
    companyId,
    action: "assignment_updated",
    id: updated.id,
  });
  return NextResponse.json(updated);
}

async function handleAssignmentManage(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  action: string,
  body: Record<string, unknown>,
  companyId: string
) {
  const assignmentId = String(body.assignmentId ?? body.id ?? "");
  const assignment = await prisma.learningAssignment.findFirst({
    where: { id: assignmentId, companyId },
  });
  if (!assignment) return notFound();

  const access = getLearningAccess(session);
  if (!access.isCreator) {
    if (!access.isManager || !session.employeeId) return forbidden();
    const report = await prisma.employee.findFirst({
      where: {
        id: assignment.employeeId,
        managerId: session.employeeId,
        user: { companyId },
      },
      select: { id: true },
    });
    if (!report && assignment.employeeId !== session.employeeId) {
      return forbidden();
    }
  }

  if (action === "assignment.delete") {
    await prisma.learningAssignment.delete({ where: { id: assignment.id } });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "assignment_deleted",
      id: assignment.id,
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.lessonProgress.deleteMany({
    where: { assignmentId: assignment.id },
  });
  const updated = await prisma.learningAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "ASSIGNED",
      progressPercent: 0,
      startedAt: null,
      completedAt: null,
      lastActivityAt: null,
      score: null,
      feedback: null,
    },
  });
  broadcastAppEvent("training_updated", {
    companyId,
    action: "assignment_reset",
    id: updated.id,
  });
  return NextResponse.json(updated);
}

async function handleEnroll(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  if (!session.employeeId) {
    return badRequest("Your account needs an employee profile before you can enroll.");
  }
  const courseId = String(body.courseId ?? "");
  const course = await prisma.learningCourse.findFirst({
    where: {
      id: courseId,
      companyId,
      status: "PUBLISHED",
      isActive: true,
    },
  });
  if (!course) return notFound();

  const assignment = await prisma.learningAssignment.upsert({
    where: {
      courseId_employeeId: {
        courseId,
        employeeId: session.employeeId,
      },
    },
    create: {
      companyId,
      courseId,
      employeeId: session.employeeId,
      assignedById: session.employeeId,
      source: "SELF",
    },
    update: {},
    include: { course: true, employee: { select: employeeSelect() } },
  });

  broadcastAppEvent("training_updated", {
    companyId,
    action: "enrolled",
    id: assignment.id,
  });
  return NextResponse.json(assignment, { status: 201 });
}

async function handleLessonProgress(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  const assignmentId = String(body.assignmentId ?? "");
  const lessonId = String(body.lessonId ?? "");
  const assignment = await prisma.learningAssignment.findFirst({
    where: { id: assignmentId, companyId },
    include: { course: { include: { modules: { include: { lessons: true } } } } },
  });
  if (!assignment) return notFound();

  const access = getLearningAccess(session);
  if (assignment.employeeId !== session.employeeId && !access.isCreator) {
    return forbidden();
  }

  const lesson = assignment.course.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId);
  if (!lesson) return notFound();

  const status =
    typeof body.status === "string" &&
    ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].includes(body.status)
      ? body.status
      : "IN_PROGRESS";

  const progress = await prisma.lessonProgress.upsert({
    where: {
      assignmentId_lessonId: { assignmentId, lessonId },
    },
    create: {
      companyId,
      assignmentId,
      lessonId,
      status,
      score: integer(body.score),
      timeSpentMinutes: integer(body.timeSpentMinutes),
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
    update: {
      status,
      score: integer(body.score),
      timeSpentMinutes: integer(body.timeSpentMinutes),
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  await prisma.learningAssignment.update({
    where: { id: assignmentId },
    data: {
      startedAt: assignment.startedAt ?? new Date(),
      lastActivityAt: new Date(),
    },
  });

  const summary = await syncAssignmentProgress(assignmentId);
  broadcastAppEvent("training_updated", {
    companyId,
    action: "lesson_progress",
    id: progress.id,
    assignmentId,
  });
  return NextResponse.json({ progress, summary });
}

async function handleRecordAction(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  action: string,
  body: Record<string, unknown>,
  companyId: string
) {
  const access = getLearningAccess(session);

  if (action === "record.delete") {
    const recordId = String(body.recordId ?? body.id ?? "");
    const record = await prisma.developmentRecord.findFirst({
      where: { id: recordId, companyId },
    });
    if (!record) return notFound();
    if (!access.isCreator && record.employeeId !== session.employeeId) {
      return forbidden();
    }
    await prisma.developmentRecord.delete({ where: { id: record.id } });
    broadcastAppEvent("training_updated", {
      companyId,
      action: "record_deleted",
      id: record.id,
    });
    return NextResponse.json({ ok: true });
  }

  const employeeId = access.isManager
    ? String(body.employeeId ?? session.employeeId ?? "")
    : session.employeeId ?? "";
  if (!employeeId) return badRequest("Choose an employee for this record.");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...learningEmployeeWhere(session) },
  });
  if (!employee) return badRequest("Employee was not found in your learning scope.");

  const title = text(body.title);
  if (!title) return badRequest("A skill or certification name is required.");
  const type = body.type === "CERTIFICATION" ? "CERTIFICATION" : "SKILL";
  const record = await prisma.developmentRecord.create({
    data: {
      companyId,
      employeeId,
      type,
      title,
      level: text(body.level),
      issuedAt: dateOrNull(body.issuedAt),
      expiresAt: dateOrNull(body.expiresAt),
      notes: text(body.notes),
    },
  });
  broadcastAppEvent("training_updated", {
    companyId,
    action: "record_created",
    id: record.id,
  });
  return NextResponse.json(record, { status: 201 });
}

async function handleRequestCreate(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  if (!session.employeeId) {
    return badRequest("Your account needs an employee profile before requesting training.");
  }
  const title = text(body.title);
  const justification = text(body.justification);
  if (!title) return badRequest("Training title is required.");
  if (!justification) return badRequest("Add a short justification for this request.");

  const request = await prisma.trainingRequest.create({
    data: {
      companyId,
      employeeId: session.employeeId,
      title,
      provider: text(body.provider),
      url: text(body.url),
      cost: money(body.cost),
      currency: text(body.currency) ?? "USD",
      startDate: dateOrNull(body.startDate),
      endDate: dateOrNull(body.endDate),
      justification,
    },
  });
  broadcastAppEvent("training_updated", {
    companyId,
    action: "request_created",
    id: request.id,
  });
  return NextResponse.json(request, { status: 201 });
}

async function handleRequestReview(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  const requestId = String(body.requestId ?? body.id ?? "");
  const request = await prisma.trainingRequest.findFirst({
    where: { id: requestId, ...learningRequestWhere(session) },
  });
  if (!request) return notFound();

  const status = String(body.status ?? "");
  if (!REQUEST_STATUSES.has(status)) {
    return badRequest("Choose approve, reject or cancel.");
  }

  const access = getLearningAccess(session);
  const isOwner = request.employeeId === session.employeeId;
  let canReview = access.isCreator || isOwner;
  if (!canReview && access.isManager && session.employeeId) {
    const report = await prisma.employee.findFirst({
      where: {
        id: request.employeeId,
        managerId: session.employeeId,
        user: { companyId },
      },
      select: { id: true },
    });
    canReview = Boolean(report);
  }
  if (!canReview) return forbidden();
  if (isOwner && !access.isManager && status !== "CANCELLED") {
    return forbidden();
  }

  const updated = await prisma.trainingRequest.update({
    where: { id: request.id },
    data: {
      status,
      reviewNote: text(body.reviewNote),
      reviewerId: session.employeeId ?? null,
      reviewedAt: new Date(),
    },
  });
  broadcastAppEvent("training_updated", {
    companyId,
    action: "request_reviewed",
    id: updated.id,
  });
  return NextResponse.json(updated);
}

async function handleFeedback(
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>,
  body: Record<string, unknown>,
  companyId: string
) {
  if (!session.employeeId) {
    return badRequest("Your account needs an employee profile before leaving feedback.");
  }
  const assignmentId = String(body.assignmentId ?? "");
  const assignment = await prisma.learningAssignment.findFirst({
    where: { id: assignmentId, companyId },
  });
  if (!assignment) return notFound();
  if (assignment.employeeId !== session.employeeId) return forbidden();

  const rating = integer(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return badRequest("Choose a rating between 1 and 5.");
  }

  const feedback = await prisma.courseFeedback.upsert({
    where: { assignmentId },
    create: {
      companyId,
      courseId: assignment.courseId,
      assignmentId,
      employeeId: session.employeeId,
      rating,
      comment: text(body.comment),
    },
    update: {
      rating,
      comment: text(body.comment),
    },
  });
  broadcastAppEvent("training_updated", {
    companyId,
    action: "feedback_created",
    id: feedback.id,
  });
  return NextResponse.json(feedback, { status: 201 });
}
