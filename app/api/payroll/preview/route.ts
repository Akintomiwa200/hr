import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canManagePayrollRecord } from "@/lib/payroll-access";
import { buildAutoPayrollBreakdown } from "@/lib/payroll-engine";
import type { PayrollLineItem } from "@/lib/payroll-types";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (session.role === "EMPLOYEE") return forbidden();

  const body = await request.json();
  const { employeeId, periodStart, periodEnd, baseSalary, bonus, manualItems } = body;

  if (!employeeId || !periodStart || !periodEnd || baseSalary === undefined) {
    return badRequest("Employee, period, and base salary are required");
  }

  const canManage = await canManagePayrollRecord(session, { employeeId });
  if (!canManage) return forbidden();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { salary: true },
  });

  const result = await buildAutoPayrollBreakdown({
    employeeId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    baseSalary: Number(baseSalary ?? employee?.salary ?? 0),
    bonus: Number(bonus ?? 0),
    manualItems: manualItems as PayrollLineItem[] | undefined,
  });

  return NextResponse.json(result);
}
