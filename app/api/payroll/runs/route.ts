import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canBulkPayroll, canViewPayrollRuns, payrollRunListWhere, payrollRunRecordWhere } from "@/lib/payroll-access";
import { normalizeRole } from "@/lib/roles";
import { refreshPayrollRunTotals } from "@/lib/payroll-bulk";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canViewPayrollRuns(session)) return forbidden();

  const isSupervisor = normalizeRole(session.role) === "SUPERVISOR";
  const runs = isSupervisor
    ? (await prisma.payrollRun.findMany({
        where: await payrollRunListWhere(session),
        orderBy: { periodStart: "desc" },
        take: 50,
        include: {
          records: {
            where: payrollRunRecordWhere(session),
            select: { grossPay: true, netPay: true },
          },
        },
      })).map(({ records, ...run }) => ({
        ...run,
        employeeCount: records.length,
        totalGross: records.reduce((sum, record) => sum + record.grossPay, 0),
        totalNet: records.reduce((sum, record) => sum + record.netPay, 0),
      }))
    : await prisma.payrollRun.findMany({
        where: await payrollRunListWhere(session),
        orderBy: { periodStart: "desc" },
        take: 50,
      });

  return NextResponse.json(runs);
}
