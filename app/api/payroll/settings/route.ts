import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canManagePayrollSettings } from "@/lib/payroll-access";
import { defaultPayrollSettings } from "@/lib/payroll-types";
import { ensurePayrollSettings } from "@/lib/payroll-engine";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  await ensurePayrollSettings();
  const settings = await prisma.payrollSettings.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(settings ?? { id: "default", ...defaultPayrollSettings });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManagePayrollSettings(session)) return forbidden();

  const body = await request.json();
  await ensurePayrollSettings();

  const settings = await prisma.payrollSettings.update({
    where: { id: "default" },
    data: {
      ...(body.holidayAllowanceEnabled !== undefined && {
        holidayAllowanceEnabled: Boolean(body.holidayAllowanceEnabled),
      }),
      ...(body.holidayAllowanceAmount !== undefined && {
        holidayAllowanceAmount: Number(body.holidayAllowanceAmount),
      }),
      ...(body.latenessDeductionPerDay !== undefined && {
        latenessDeductionPerDay: Number(body.latenessDeductionPerDay),
      }),
      ...(body.absenceDeductionPerDay !== undefined && {
        absenceDeductionPerDay: Number(body.absenceDeductionPerDay),
      }),
      ...(body.damageDeductionEnabled !== undefined && {
        damageDeductionEnabled: Boolean(body.damageDeductionEnabled),
      }),
      ...(body.taxRatePercent !== undefined && {
        taxRatePercent: Number(body.taxRatePercent),
      }),
    },
  });

  revalidatePath("/payroll");
  return NextResponse.json(settings);
}
