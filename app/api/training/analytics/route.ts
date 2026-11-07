import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden } from "@/lib/api-auth";
import {
  getLearningAccess,
  learningAssignmentWhere,
} from "@/lib/learning/access";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const access = getLearningAccess(session);
  if (!access.companyId) return forbidden();
  if (!access.isManager) return forbidden();

  const [assignments, feedback] = await Promise.all([
    prisma.learningAssignment.findMany({
      where: learningAssignmentWhere(session),
      include: {
        course: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            _count: { select: { modules: true } },
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.courseFeedback.aggregate({
      where: { companyId: access.companyId },
      _avg: { rating: true },
    }),
  ]);

  const now = Date.now();
  const completedAssignments = assignments.filter(
    (item) => item.status === "COMPLETED"
  );
  const inProgress = assignments.filter(
    (item) => item.status === "IN_PROGRESS"
  );
  const overdue = assignments.filter(
    (item) =>
      item.status !== "COMPLETED" &&
      item.dueDate &&
      new Date(item.dueDate).getTime() < now
  );
  const scored = assignments.filter((item) => item.score !== null);
  const trainingMinutes = completedAssignments.reduce(
    (total, item) => total + (item.course.durationMinutes ?? 0),
    0
  );

  const courseMap = new Map<
    string,
    {
      courseId: string;
      title: string;
      assignments: number;
      completed: number;
      inProgress: number;
      progressTotal: number;
    }
  >();
  for (const item of assignments) {
    const entry = courseMap.get(item.courseId) ?? {
      courseId: item.courseId,
      title: item.course.title,
      assignments: 0,
      completed: 0,
      inProgress: 0,
      progressTotal: 0,
    };
    entry.assignments += 1;
    entry.progressTotal += item.progressPercent;
    if (item.status === "COMPLETED") entry.completed += 1;
    if (item.status === "IN_PROGRESS") entry.inProgress += 1;
    courseMap.set(item.courseId, entry);
  }

  const departmentMap = new Map<
    string,
    { department: string; assignments: number; completed: number }
  >();
  for (const item of assignments) {
    const department = item.employee.department?.name ?? "Unassigned";
    const entry = departmentMap.get(department) ?? {
      department,
      assignments: 0,
      completed: 0,
    };
    entry.assignments += 1;
    if (item.status === "COMPLETED") entry.completed += 1;
    departmentMap.set(department, entry);
  }

  const statusMap = new Map<string, number>();
  for (const item of assignments) {
    statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + 1);
  }

  const byCourse = [...courseMap.values()]
    .map((entry) => ({
      courseId: entry.courseId,
      title: entry.title,
      assignments: entry.assignments,
      completed: entry.completed,
      inProgress: entry.inProgress,
      completionRate:
        entry.assignments > 0
          ? Math.round((entry.completed / entry.assignments) * 100)
          : 0,
      averageProgress:
        entry.assignments > 0
          ? Math.round(entry.progressTotal / entry.assignments)
          : 0,
    }))
    .sort((a, b) => b.assignments - a.assignments);

  return NextResponse.json({
    totals: {
      learners: new Set(assignments.map((item) => item.employeeId)).size,
      assignments: assignments.length,
      completed: completedAssignments.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completionRate:
        assignments.length > 0
          ? Math.round((completedAssignments.length / assignments.length) * 100)
          : 0,
      averageScore:
        scored.length > 0
          ? Math.round(
              scored.reduce((total, item) => total + (item.score ?? 0), 0) /
                scored.length
            )
          : null,
      feedbackAverage: feedback._avg.rating
        ? Math.round(feedback._avg.rating * 10) / 10
        : null,
      trainingHours: Math.round((trainingMinutes / 60) * 10) / 10,
    },
    byCourse,
    byDepartment: [...departmentMap.values()]
      .map((entry) => ({
        ...entry,
        completionRate:
          entry.assignments > 0
            ? Math.round((entry.completed / entry.assignments) * 100)
            : 0,
      }))
      .sort((a, b) => b.assignments - a.assignments),
    byStatus: [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    recentCompletions: completedAssignments
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.updatedAt).getTime() -
          new Date(a.completedAt ?? a.updatedAt).getTime()
      )
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        employee: `${item.employee.firstName} ${item.employee.lastName}`,
        course: item.course.title,
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
  });
}
