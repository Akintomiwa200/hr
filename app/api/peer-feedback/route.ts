import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { employeeCompanyWhere, getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

const ADMIN = ["COMPANY_ADMIN", "HR"] as const;
const canManage = (role: Parameters<typeof hasRole>[0]) => hasRole(role, [...ADMIN]);

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return NextResponse.json({ requests: [], employees: [], cycles: [], canManage: false });
  const admin = canManage(session.role);
  const [requests, employees, cycles] = await Promise.all([
    prisma.peerFeedbackRequest.findMany({
      where: { companyId, ...(admin ? {} : { reviewerEmployeeId: session.employeeId ?? "__none__" }) },
      include: {
        cycle: { select: { id: true, name: true, period: true } },
        subject: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    admin ? prisma.employee.findMany({ where: employeeCompanyWhere(getCompanyScope(session)), select: { id: true, firstName: true, lastName: true, employeeCode: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }) : Promise.resolve([]),
    admin ? prisma.appraisalCycle.findMany({ where: { companyId, status: "ACTIVE" }, select: { id: true, name: true, period: true }, orderBy: { startDate: "desc" } }) : Promise.resolve([]),
  ]);
  return NextResponse.json({ requests, employees, cycles, canManage: admin });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManage(session.role)) return forbidden();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return forbidden();
  const body = await request.json();
  const subjectEmployeeId = String(body.subjectEmployeeId ?? "");
  const reviewerEmployeeId = String(body.reviewerEmployeeId ?? "");
  const cycleId = String(body.cycleId ?? "");
  if (!subjectEmployeeId || !reviewerEmployeeId || !cycleId || subjectEmployeeId === reviewerEmployeeId) return badRequest("Choose an active cycle, a staff member, and a different reviewer.");
  const [subject, reviewer, cycle] = await Promise.all([
    prisma.employee.findFirst({ where: { id: subjectEmployeeId, ...employeeCompanyWhere(getCompanyScope(session)) }, select: { id: true } }),
    prisma.employee.findFirst({ where: { id: reviewerEmployeeId, ...employeeCompanyWhere(getCompanyScope(session)) }, select: { id: true } }),
    prisma.appraisalCycle.findFirst({ where: { id: cycleId, companyId, status: "ACTIVE" }, select: { id: true } }),
  ]);
  if (!subject || !reviewer || !cycle) return badRequest("The cycle and both employees must belong to your company.");
  const feedback = await prisma.peerFeedbackRequest.upsert({
    where: { cycleId_subjectEmployeeId_reviewerEmployeeId: { cycleId, subjectEmployeeId, reviewerEmployeeId } },
    create: { companyId, cycleId, subjectEmployeeId, reviewerEmployeeId, dueDate: body.dueDate ? new Date(body.dueDate) : null },
    update: { dueDate: body.dueDate ? new Date(body.dueDate) : null, status: "PENDING", feedback: null, rating: null, submittedAt: null },
  });
  broadcastAppEvent("staff_review_updated", { companyId, action: "peer_feedback_assigned", id: feedback.id });
  return NextResponse.json(feedback, { status: 201 });
}
