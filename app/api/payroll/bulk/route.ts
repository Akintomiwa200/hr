import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canBulkPayroll } from "@/lib/payroll-access";
import { createPayrollRun } from "@/lib/payroll-bulk";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canBulkPayroll(session)) return forbidden();

  const body = await request.json();
  const { periodStart, periodEnd, label, status, skipExisting, employeeIds } = body;

  if (!periodStart || !periodEnd) {
    return badRequest("Period start and end are required");
  }

  const result = await createPayrollRun({
    companyId: session.companyId ?? null,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    label,
    status,
    createdByName:
      [session.firstName, session.lastName].filter(Boolean).join(" ") ||
      session.email ||
      "Payroll",
    skipExisting: skipExisting !== false,
    employeeIds: Array.isArray(employeeIds) ? employeeIds : undefined,
  });

  if (status === "PAID" || status === "PROCESSED") {
    const userIds = [...new Set(result.run.records.map((row) => row.employee.userId))];
    for (const userId of userIds) {
      await createNotification({
        userId,
        type: "payroll",
        title: "Payslip available",
        message: `Payroll for ${new Date(periodStart).toLocaleDateString()} is ready to view`,
        href: "/payroll",
      });
    }
  }

  broadcastAppEvent("payroll_updated", { runId: result.run.id });
  revalidatePath("/payroll");
  revalidatePath("/payroll/runs");

  return NextResponse.json(result);
}
