import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  badRequest,
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { canManagePayroll } from "@/lib/roles";
import {
  cancelPayrollDeduction,
  createPayrollDeduction,
  listPayrollDeductions,
} from "@/lib/payroll-deductions";
import { canManagePayrollRecord } from "@/lib/payroll-access";
import { periodMonthKey } from "@/lib/payroll-working-days";

function authorName(session: {
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  const name = `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim();
  return name || session.email;
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManagePayroll(session.role)) return forbidden();

  const scope = getCompanyScope(session);
  const status = request.nextUrl.searchParams.get("status") ?? "PENDING";
  const employeeId = request.nextUrl.searchParams.get("employeeId") ?? undefined;

  const rows = await listPayrollDeductions({
    companyId: scope.companyId,
    employeeId,
    status,
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManagePayroll(session.role)) return forbidden();

  const body = await request.json();
  const { employeeId, amount, reason, periodMonth } = body;

  if (!employeeId) return badRequest("employeeId is required");
  if (!reason?.trim()) return badRequest("A narration/reason is required");
  if (amount === undefined || Number(amount) <= 0) {
    return badRequest("amount must be greater than zero");
  }

  const canManage = await canManagePayrollRecord(session, { employeeId });
  if (!canManage) return forbidden();

  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);

  const row = await createPayrollDeduction({
    companyId,
    employeeId,
    amount: Number(amount),
    reason: String(reason).trim(),
    periodMonth: periodMonth ? String(periodMonth) : periodMonthKey(new Date()),
    createdById: session.employeeId ?? null,
    createdByName: authorName(session),
  });

  broadcastAppEvent("payroll_updated", { action: "deduction_created" });
  revalidatePath("/payroll/deductions");
  revalidatePath("/payroll");
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManagePayroll(session.role)) return forbidden();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id is required");

  await cancelPayrollDeduction(id);
  broadcastAppEvent("payroll_updated", { action: "deduction_cancelled" });
  revalidatePath("/payroll/deductions");
  return NextResponse.json({ success: true });
}
