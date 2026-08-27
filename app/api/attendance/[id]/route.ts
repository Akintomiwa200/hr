import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession, unauthorized, forbidden, notFound } from "@/lib/api-auth";
import { canManageEmployees } from "@/lib/roles";
import { canViewEmployeeTimeData } from "@/lib/employee-access";
import { upsertManualAttendance } from "@/lib/attendance-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageEmployees(session.role)) return forbidden();

  const { id } = await params;
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) return notFound();

  if (!(await canViewEmployeeTimeData(session, existing.employeeId))) {
    return forbidden();
  }

  const body = await request.json();
  const record = await upsertManualAttendance({
    employeeId: existing.employeeId,
    date: existing.date,
    checkIn:
      body.checkIn !== undefined
        ? body.checkIn
          ? new Date(body.checkIn)
          : null
        : existing.checkIn,
    checkOut:
      body.checkOut !== undefined
        ? body.checkOut
          ? new Date(body.checkOut)
          : null
        : existing.checkOut,
    status: body.status ?? existing.status,
  });

  revalidatePath("/attendance");
  revalidatePath(`/employees/${existing.employeeId}/attendance`);

  return NextResponse.json(record);
}
