import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import {
  canManagePayrollRecord,
  payrollListWhere,
} from "@/lib/payroll-access";
import {
  buildAutoPayrollBreakdown,
  ensurePayrollSettings,
  summarizePayroll,
} from "@/lib/payroll-engine";
import {
  type PayrollLineItem,
  serializeBreakdown,
} from "@/lib/payroll-types";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const records = await prisma.payrollRecord.findMany({
    where: await payrollListWhere(session),
    include: { employee: true },
    orderBy: { periodStart: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (session.role === "EMPLOYEE") return forbidden();

  const body = await request.json();
  const {
    employeeId,
    periodStart,
    periodEnd,
    baseSalary,
    bonus,
    status,
    notes,
    breakdown,
    manualItems,
  } = body;

  if (!employeeId || !periodStart || !periodEnd || baseSalary === undefined) {
    return badRequest("Employee, period, and base salary are required");
  }

  const canManage = await canManagePayrollRecord(session, { employeeId });
  if (!canManage) return forbidden();

  await ensurePayrollSettings();

  let items: PayrollLineItem[];
  if (Array.isArray(breakdown) && breakdown.length > 0) {
    items = breakdown;
  } else {
    const result = await buildAutoPayrollBreakdown({
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseSalary: Number(baseSalary),
      bonus: Number(bonus ?? 0),
      manualItems,
    });
    items = result.items;
  }

  const summary = summarizePayroll(items);

  const record = await prisma.payrollRecord.create({
    data: {
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseSalary: summary.baseSalary,
      bonus: summary.bonus,
      deductions: summary.deductions,
      grossPay: summary.grossPay,
      netPay: summary.netPay,
      breakdown: serializeBreakdown(items),
      notes: notes ?? null,
      status: status || "DRAFT",
      paidAt: status === "PAID" ? new Date() : null,
    },
    include: { employee: true },
  });

  broadcastEvent("payroll_updated", { id: record.id });
  revalidatePath("/payroll");
  revalidatePath(`/employees/${employeeId}/payroll`);
  return NextResponse.json(record);
}
