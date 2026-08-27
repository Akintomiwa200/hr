import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canBulkPayroll, payrollRunListWhere } from "@/lib/payroll-access";
import { refreshPayrollRunTotals } from "@/lib/payroll-bulk";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canBulkPayroll(session)) return forbidden();

  const { id } = await params;
  const run = await prisma.payrollRun.findFirst({
    where: { id, ...(await payrollRunListWhere(session)) },
    include: {
      records: {
        include: {
          employee: { include: { department: true } },
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!run) return notFound();

  return NextResponse.json(run);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canBulkPayroll(session)) return forbidden();

  const { id } = await params;
  const existing = await prisma.payrollRun.findFirst({
    where: { id, ...(await payrollRunListWhere(session)) },
  });
  if (!existing) return notFound();

  const body = await request.json();
  const { status, label } = body;

  if (status) {
    await prisma.payrollRecord.updateMany({
      where: { payrollRunId: id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });
  }

  const run = await prisma.payrollRun.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(label !== undefined ? { label } : {}),
    },
    include: {
      records: {
        include: { employee: { include: { user: true, department: true } } },
      },
    },
  });

  await refreshPayrollRunTotals(id);

  if (status === "PAID" || status === "PROCESSED") {
    for (const record of run.records) {
      await createNotification({
        userId: record.employee.userId,
        type: "payroll",
        title: "Payslip available",
        message: `Payroll for ${run.periodStart.toLocaleDateString()} is ready to view`,
        href: "/payroll",
      });
    }
  }

  broadcastAppEvent("payroll_updated", { runId: id });
  revalidatePath("/payroll");
  revalidatePath("/payroll/runs");
  revalidatePath(`/payroll/runs/${id}`);

  return NextResponse.json(run);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canBulkPayroll(session)) return forbidden();

  const { id } = await params;
  const existing = await prisma.payrollRun.findFirst({
    where: { id, ...(await payrollRunListWhere(session)) },
  });
  if (!existing) return notFound();

  await prisma.payrollRecord.deleteMany({ where: { payrollRunId: id } });
  await prisma.payrollRun.delete({ where: { id } });

  broadcastAppEvent("payroll_updated", { runId: id });
  revalidatePath("/payroll");
  revalidatePath("/payroll/runs");

  return NextResponse.json({ success: true });
}
