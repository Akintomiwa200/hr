import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { hasRole } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!hasRole(session.role, ["COMPANY_ADMIN", "HR"])) return forbidden();
  const { id } = await params;
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return forbidden();
  const existing = await prisma.staffChangeRequest.findFirst({ where: { id, companyId } });
  if (!existing) return notFound();
  if (existing.status !== "PENDING") return badRequest("This request has already been reviewed.");
  const { status, reviewNote } = await request.json();
  if (!["APPROVED", "REJECTED"].includes(status)) return badRequest("Choose approve or reject.");
  const note = typeof reviewNote === "string" ? reviewNote.trim() : "";
  if (status === "REJECTED" && note.length < 8) return badRequest("Add a short reason before declining this request.");
  const updated = await prisma.staffChangeRequest.update({ where: { id }, data: { status, reviewNote: note || null, reviewerId: session.employeeId ?? null, reviewedAt: new Date() } });
  broadcastAppEvent("staff_review_updated", { companyId, action: "request_reviewed", id });
  return NextResponse.json(updated);
}
