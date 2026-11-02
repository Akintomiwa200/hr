import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isShiftAssignmentModelReady } from "@/lib/prisma";
import { badRequest, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManageOrgContent } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageOrgContent(session.role)) return unauthorized();
  if (!isShiftAssignmentModelReady()) return NextResponse.json({ error: "Shift scheduling is not available until the database migration is applied." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Shift";
  const startAt = parseDate(body?.startAt);
  const endAt = parseDate(body?.endAt);
  if (!employeeId) return badRequest("Choose an employee for this shift.");
  if (!startAt || !endAt || endAt <= startAt) return badRequest("Choose a valid start and end time.");

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return unauthorized();
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, status: "ACTIVE", user: { companyId } }, select: { id: true } });
  if (!employee) return badRequest("Choose an active employee from your company.");

  const shift = await prisma.shiftAssignment.create({
    data: {
      companyId,
      employeeId,
      title,
      notes: typeof body?.notes === "string" ? body.notes.trim() || null : null,
      startAt,
      endAt,
      assignedById: session.id,
    },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });

  broadcastAppEvent("shift_updated", { id: shift.id, employeeId, companyId });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json(shift);
}
