import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isShiftAssignmentModelReady } from "@/lib/prisma";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageOrgContent } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();
  if (!isShiftAssignmentModelReady()) return NextResponse.json({ error: "Shift scheduling is unavailable." }, { status: 503 });
  const { id } = await params;
  const existing = await prisma.shiftAssignment.findUnique({ where: { id } });
  if (!existing || existing.companyId !== session.companyId) return notFound();
  const body = await request.json().catch(() => null);
  const data: { employeeId?: string; title?: string; notes?: string | null; startAt?: Date; endAt?: Date } = {};
  if (body?.employeeId !== undefined) {
    if (typeof body.employeeId !== "string") return badRequest("Choose a valid employee.");
    const employee = await prisma.employee.findFirst({ where: { id: body.employeeId, status: "ACTIVE", user: { companyId: session.companyId! } }, select: { id: true } });
    if (!employee) return badRequest("Choose an active employee from your company.");
    data.employeeId = employee.id;
  }
  if (body?.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) return badRequest("Shift title is required.");
    data.title = body.title.trim();
  }
  if (body?.notes !== undefined) data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const startAt = body?.startAt === undefined ? existing.startAt : parseDate(body.startAt);
  const endAt = body?.endAt === undefined ? existing.endAt : parseDate(body.endAt);
  if (!startAt || !endAt || endAt <= startAt) return badRequest("Choose a valid start and end time.");
  if (body?.startAt !== undefined) data.startAt = startAt;
  if (body?.endAt !== undefined) data.endAt = endAt;

  const shift = await prisma.shiftAssignment.update({ where: { id }, data });
  broadcastAppEvent("shift_updated", { id, employeeId: shift.employeeId, companyId: shift.companyId });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json(shift);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session || !canManageOrgContent(session.role)) return unauthorized();
  const { id } = await params;
  const existing = await prisma.shiftAssignment.findUnique({ where: { id } });
  if (!existing || existing.companyId !== session.companyId) return notFound();
  await prisma.shiftAssignment.delete({ where: { id } });
  broadcastAppEvent("shift_updated", { id, employeeId: existing.employeeId, companyId: existing.companyId });
  revalidatePath("/holidays");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
