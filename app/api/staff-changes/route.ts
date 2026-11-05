import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { employeeCompanyWhere, getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const ADMIN = ["COMPANY_ADMIN", "HR"] as const;
const isAdmin = (role: Parameters<typeof hasRole>[0]) => hasRole(role, [...ADMIN]);

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);
  if (!companyId) return NextResponse.json({ requests: [], employees: [], canManage: false });
  const admin = isAdmin(session.role);
  const manager = session.role === "MANAGER" && !!session.employeeId;
  const employeeScope = admin
    ? employeeCompanyWhere(scope)
    : manager
      ? { OR: [{ id: session.employeeId! }, { managerId: session.employeeId! }], user: { companyId } }
      : { id: session.employeeId ?? "__none__", user: { companyId } };
  const [requests, employees] = await Promise.all([
    prisma.staffChangeRequest.findMany({ where: { companyId, employee: employeeScope }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } }, requestedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.employee.findMany({ where: employeeScope, select: { id: true, firstName: true, lastName: true, employeeCode: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);
  return NextResponse.json({ requests, employees, canManage: admin, canRecommend: true });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId || !session.employeeId) return forbidden();
  const body = await request.json();
  const type = body.type === "SALARY_INCREMENT" ? "SALARY_INCREMENT" : body.type === "PROMOTION" ? "PROMOTION" : null;
  if (!type) return badRequest("Choose promotion or salary increment.");
  const employeeId = isAdmin(session.role) || session.role === "MANAGER" ? String(body.employeeId ?? "") : session.employeeId;
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, ...employeeCompanyWhere(getCompanyScope(session)) } });
  if (!employee) return badRequest("Choose an employee in your company.");
  if (session.role === "MANAGER" && employee.managerId !== session.employeeId && employee.id !== session.employeeId) return forbidden();
  const title = String(body.title ?? "").trim();
  const rationale = String(body.rationale ?? "").trim();
  if (!title || !rationale) return badRequest("A title and rationale are required.");
  const created = await prisma.staffChangeRequest.create({ data: { companyId, employeeId, requestedById: session.employeeId, type, title, currentValue: body.currentValue?.trim() || null, proposedValue: body.proposedValue?.trim() || null, rationale } });
  broadcastAppEvent("staff_review_updated", { companyId, action: "request_created", id: created.id });
  return NextResponse.json(created, { status: 201 });
}
