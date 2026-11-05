import { NextRequest, NextResponse } from "next/server";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { requireSession, unauthorized, badRequest, forbidden } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId, employeeCompanyWhere } from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const ADMIN_ROLES = ["COMPANY_ADMIN", "HR"] as const;
const canAdmin = (role: Parameters<typeof hasRole>[0]) => hasRole(role, [...ADMIN_ROLES]);

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);
  if (!companyId) return NextResponse.json({ courses: [], assignments: [], records: [] });
  const isAdmin = canAdmin(session.role);
  const isManager = session.role === "MANAGER" && !!session.employeeId;
  const employeeWhere = isAdmin
    ? employeeCompanyWhere(scope)
    : isManager
      ? { OR: [{ id: session.employeeId! }, { managerId: session.employeeId! }], user: { companyId } }
      : { id: session.employeeId ?? "__none__", user: { companyId } };

  try {
  const [courses, assignments, records, employees] = await withPrismaRetry(() => Promise.all([
    prisma.learningCourse.findMany({ where: { companyId, isActive: true }, include: { _count: { select: { assignments: true } } }, orderBy: { title: "asc" } }),
    prisma.learningAssignment.findMany({
      where: { companyId, ...(isAdmin ? {} : { employee: employeeWhere }) },
      include: { course: true, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.developmentRecord.findMany({
      where: { companyId, ...(isAdmin ? {} : { employee: employeeWhere }) },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    isAdmin ? prisma.employee.findMany({ where: employeeCompanyWhere(scope), select: { id: true, firstName: true, lastName: true, employeeCode: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }) : Promise.resolve([]),
  ]));
  return NextResponse.json({ courses, assignments, records, employees, canManage: isAdmin, canReviewTeam: isManager });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    console.error("Training data load failed", { code, message });
    if (code === "P2021" || /does not exist|relation .* missing/i.test(message)) {
      return NextResponse.json({ error: "The learning tables are not installed in this database yet. Run the project database sync, then retry.", code: "TRAINING_SCHEMA_MISSING" }, { status: 503 });
    }
    if (/cannot read properties of undefined|undefined.*findmany/i.test(message)) {
      return NextResponse.json({ error: "The app server is still using an older database client. Restart the app server, then retry.", code: "TRAINING_CLIENT_STALE" }, { status: 503 });
    }
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code) || /connection|timeout|econnreset/i.test(message)) {
      return NextResponse.json({ error: "The learning database could not be reached. Check the database connection and retry.", code: "TRAINING_DATABASE_UNREACHABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "Training data could not be read. Retry, and contact support if this continues.", code: "TRAINING_QUERY_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId || !session.employeeId) return forbidden();
  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "course") {
    if (!canAdmin(session.role)) return forbidden();
    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("Course title is required.");
    const course = await prisma.learningCourse.create({ data: { companyId, title, description: body.description?.trim() || null, provider: body.provider?.trim() || null, url: body.url?.trim() || null } });
    broadcastAppEvent("training_updated", { companyId, action: "course_created", id: course.id });
    return NextResponse.json(course, { status: 201 });
  }

  if (action === "assignment") {
    if (!canAdmin(session.role)) return forbidden();
    const courseId = String(body.courseId ?? "");
    const employeeId = String(body.employeeId ?? "");
    const [course, employee] = await Promise.all([
      prisma.learningCourse.findFirst({ where: { id: courseId, companyId, isActive: true } }),
      prisma.employee.findFirst({ where: { id: employeeId, ...employeeCompanyWhere(getCompanyScope(session)) } }),
    ]);
    if (!course || !employee) return badRequest("Choose a course and an employee from this company.");
    const assignment = await prisma.learningAssignment.upsert({
      where: { courseId_employeeId: { courseId, employeeId } },
      create: { companyId, courseId, employeeId, assignedById: session.employeeId, dueDate: body.dueDate ? new Date(body.dueDate) : null },
      update: { dueDate: body.dueDate ? new Date(body.dueDate) : null, status: "ASSIGNED", completedAt: null, assignedById: session.employeeId },
      include: { course: true, employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    broadcastAppEvent("training_updated", { companyId, action: "assignment_created", id: assignment.id });
    return NextResponse.json(assignment, { status: 201 });
  }

  if (action === "record") {
    const employeeId = canAdmin(session.role) ? String(body.employeeId ?? "") : session.employeeId;
    if (!employeeId || (!canAdmin(session.role) && session.role === "MANAGER")) return forbidden();
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, ...employeeCompanyWhere(getCompanyScope(session)) } });
    if (!employee) return badRequest("Employee was not found in this company.");
    const title = String(body.title ?? "").trim();
    const type = body.type === "CERTIFICATION" ? "CERTIFICATION" : "SKILL";
    if (!title) return badRequest("A skill or certification name is required.");
    const record = await prisma.developmentRecord.create({ data: { companyId, employeeId, type, title, level: body.level?.trim() || null, issuedAt: body.issuedAt ? new Date(body.issuedAt) : null, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, notes: body.notes?.trim() || null } });
    broadcastAppEvent("training_updated", { companyId, action: "record_created", id: record.id });
    return NextResponse.json(record, { status: 201 });
  }
  return badRequest("Unknown training action.");
}
