import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, notFound } from "@/lib/api-auth";
import {
  getLearningAccess,
  learningAssignmentWhere,
} from "@/lib/learning/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const access = getLearningAccess(session);
  if (!access.companyId) return notFound();

  const { id } = await params;
  const course = await prisma.learningCourse.findFirst({
    where: { id, companyId: access.companyId },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { orderBy: { position: "asc" } } },
      },
      _count: {
        select: { assignments: true, modules: true, pathCourses: true },
      },
    },
  });

  if (!course) return notFound();
  if (!access.isCreator && (course.status !== "PUBLISHED" || !course.isActive)) {
    return notFound();
  }

  const [assignment, assignments, feedback] = await Promise.all([
    session.employeeId
      ? prisma.learningAssignment.findFirst({
          where: {
            courseId: course.id,
            companyId: access.companyId,
            employeeId: session.employeeId,
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeCode: true },
            },
            lessonProgress: true,
          },
        })
      : Promise.resolve(null),
    access.isManager
      ? prisma.learningAssignment.findMany({
          where: {
            courseId: course.id,
            ...learningAssignmentWhere(session),
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.courseFeedback.findMany({
      where: { courseId: course.id, companyId: access.companyId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    course,
    assignment,
    assignments,
    feedback,
    access,
  });
}
