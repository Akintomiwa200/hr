import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canManagePayrollSettings } from "@/lib/payroll-access";
import { ensurePayrollSettings, getPayrollSettings, updatePayrollSettings } from "@/lib/payroll-engine";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  await ensurePayrollSettings(session.companyId);
  const settings = await getPayrollSettings(session.companyId);

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManagePayrollSettings(session)) return forbidden();

  const body = await request.json();

  const settings = await updatePayrollSettings(session.companyId, {
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
    ...(body.workingDaysPerWeek !== undefined && {
      workingDaysPerWeek: Number(body.workingDaysPerWeek) === 6 ? 6 : 5,
    }),
    ...(body.proRataSalaryEnabled !== undefined && {
      proRataSalaryEnabled: Boolean(body.proRataSalaryEnabled),
    }),
    ...(body.overtimeEnabled !== undefined && {
      overtimeEnabled: Boolean(body.overtimeEnabled),
    }),
    ...(body.overtimeMultiplier !== undefined && {
      overtimeMultiplier: Number(body.overtimeMultiplier),
    }),
    ...(body.overtimeThresholdMinutes !== undefined && {
      overtimeThresholdMinutes: Number(body.overtimeThresholdMinutes),
    }),
  });

  revalidatePath("/payroll");
  broadcastAppEvent("payroll_updated", { action: "settings_updated" });
  await audit({
    actor: session,
    module: "payroll",
    action: "SETTING",
    entityLabel: "Payroll settings",
    meta: Object.keys(body).length ? { fields: Object.keys(body).sort() } : undefined,
  });
  return NextResponse.json(settings);
}
