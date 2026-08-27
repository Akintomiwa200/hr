import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";
import { canManageEmployees } from "@/lib/roles";
import { assertEmployeeInCompany } from "@/lib/employee-access";
import { upsertManualAttendance } from "@/lib/attendance-service";
import type { AttendanceStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageEmployees(session.role)) return forbidden();

  const body = await request.json();
  const { employeeId, date, checkIn, checkOut, status } = body;

  if (!employeeId || !date) {
    return badRequest("Employee and date are required");
  }

  if (!(await assertEmployeeInCompany(session, employeeId))) {
    return forbidden();
  }

  const record = await upsertManualAttendance({
    employeeId,
    date: new Date(date),
    checkIn: checkIn ? new Date(checkIn) : checkIn === null ? null : undefined,
    checkOut: checkOut ? new Date(checkOut) : checkOut === null ? null : undefined,
    status: status as AttendanceStatus | undefined,
  });

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}/attendance`);

  return NextResponse.json(record);
}
