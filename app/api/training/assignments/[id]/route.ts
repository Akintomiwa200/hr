import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManagePerformance } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  const { id } = await params;
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return forbidden();
  const assignment = await prisma.learningAssignment.findFirst({ where: { id, companyId } });
  if (!assignment) return notFound();
  const body = await request.json();
  const isAdmin = canManagePerformance(session.role) && ["COMPANY_ADMIN", "HR"].includes(session.role);
  if (!isAdmin && assignment.employeeId !== session.employeeId) return forbidden();
  const status = String(body.status ?? "");
  if (!isAdmin && !["IN_PROGRESS", "COMPLETED"].includes(status)) return forbidden();
  if (!isAdmin && !["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(status)) return badRequest("Invalid assignment status.");
  const updated = await prisma.learningAssignment.update({ where: { id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null, ...(isAdmin && body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}) }, include: { course: true } });
  broadcastAppEvent("training_updated", { companyId, action: "assignment_updated", id });
  return NextResponse.json(updated);
}
