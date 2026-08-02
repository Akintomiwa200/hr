import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/events";
import {
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import {
  canManagePayrollRecord,
  canViewPayrollRecord,
} from "@/lib/payroll-access";
import {
  buildAutoPayrollBreakdown,
  legacyBreakdownFromRecord,
  summarizePayroll,
} from "@/lib/payroll-engine";
import {
  type PayrollLineItem,
  serializeBreakdown,
} from "@/lib/payroll-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const record = await prisma.payrollRecord.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true } },
    },
  });
  if (!record) return notFound();

  const allowed = await canViewPayrollRecord(session, record);
  if (!allowed) return forbidden();

  const breakdown = legacyBreakdownFromRecord(record);
  const canManage = await canManagePayrollRecord(session, record);

  return NextResponse.json({ ...record, breakdown, canManage });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!existing) return notFound();

  const canManage = await canManagePayrollRecord(session, existing);
  if (!canManage) return forbidden();

  let base = existing.baseSalary;
  let bonus = existing.bonus;
  let deductions = existing.deductions;
  let grossPay = existing.grossPay;
  let netPay = existing.netPay;
  let breakdownJson = existing.breakdown;

  if (Array.isArray(body.breakdown)) {
    const items = body.breakdown as PayrollLineItem[];
    const summary = summarizePayroll(items);
    base = summary.baseSalary;
    bonus = summary.bonus;
    deductions = summary.deductions;
    grossPay = summary.grossPay;
    netPay = summary.netPay;
    breakdownJson = serializeBreakdown(items);
  } else if (body.recalculate) {
    const result = await buildAutoPayrollBreakdown({
      employeeId: existing.employeeId,
      periodStart: body.periodStart ? new Date(body.periodStart) : existing.periodStart,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : existing.periodEnd,
      baseSalary:
        body.baseSalary !== undefined ? Number(body.baseSalary) : existing.baseSalary,
      bonus: body.bonus !== undefined ? Number(body.bonus) : existing.bonus,
      manualItems: body.manualItems,
    });
    base = result.summary.baseSalary;
    bonus = result.summary.bonus;
    deductions = result.summary.deductions;
    grossPay = result.summary.grossPay;
    netPay = result.summary.netPay;
    breakdownJson = serializeBreakdown(result.items);
  } else {
    base = body.baseSalary !== undefined ? Number(body.baseSalary) : existing.baseSalary;
    bonus = body.bonus !== undefined ? Number(body.bonus) : existing.bonus;
    deductions =
      body.deductions !== undefined ? Number(body.deductions) : existing.deductions;
    grossPay = base + bonus;
    netPay = base + bonus - deductions;
  }

  const record = await prisma.payrollRecord.update({
    where: { id },
    data: {
      ...(body.periodStart !== undefined && { periodStart: new Date(body.periodStart) }),
      ...(body.periodEnd !== undefined && { periodEnd: new Date(body.periodEnd) }),
      baseSalary: base,
      bonus,
      deductions,
      grossPay,
      netPay,
      ...(breakdownJson !== undefined && { breakdown: breakdownJson }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status !== undefined && {
        status: body.status,
        paidAt: body.status === "PAID" ? new Date() : existing.paidAt,
      }),
    },
    include: { employee: { include: { department: true } } },
  });

  broadcastEvent("payroll_updated", { id });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${id}`);
  revalidatePath(`/employees/${record.employeeId}/payroll`);
  return NextResponse.json(record);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") return unauthorized();

  const { id } = await params;
  const existing = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!existing) return notFound();

  await prisma.payrollRecord.delete({ where: { id } });
  broadcastEvent("payroll_updated", { id });
  revalidatePath("/payroll");
  return NextResponse.json({ success: true });
}
