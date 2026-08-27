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
import { canBulkPayroll, payrollRunListWhere } from "@/lib/payroll-access";
import { refreshPayrollRunTotals } from "@/lib/payroll-bulk";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canBulkPayroll(session)) return forbidden();

  const runs = await prisma.payrollRun.findMany({
    where: await payrollRunListWhere(session),
    orderBy: { periodStart: "desc" },
    take: 50,
  });

  return NextResponse.json(runs);
}
