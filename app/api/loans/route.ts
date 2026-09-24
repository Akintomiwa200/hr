import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { prisma } from "@/lib/prisma";
import { badRequest, forbidden, requireSession, unauthorized } from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { LOAN_APPROVER_ROLES, canApproveLoans, hasRole } from "@/lib/roles";
import { createLoan, listLoans, loanListWhere } from "@/lib/loans";
import { notifyCompanyUsers } from "@/lib/notifications";
import { fullName } from "@/lib/utils";
import { audit } from "@/lib/audit";

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
  if (!hasRole(session.role, [...LOAN_APPROVER_ROLES, "EMPLOYEE"])) return forbidden();

  const status = request.nextUrl.searchParams.get("status") ?? "ALL";
  const employeeId = request.nextUrl.searchParams.get("employeeId") ?? undefined;

  const loans = await listLoans({
    where: loanListWhere(session),
    status,
    employeeId,
  });
  return NextResponse.json(loans);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const isApprover = canApproveLoans(session.role);
  if (!isApprover && !session.employeeId) return forbidden();

  const body = await request.json();
  const {
    employeeId,
    amount,
    tenureMonths,
    startMonth,
    interestRate,
    purpose,
    note,
  } = body;

  const targetEmployeeId = String(employeeId ?? "");
  if (!targetEmployeeId) return badRequest("employeeId is required");
  if (!isApprover && targetEmployeeId !== session.employeeId) {
    return forbidden();
  }
  if (amount === undefined || Number(amount) <= 0) {
    return badRequest("amount must be greater than zero");
  }
  const tenure = Number(tenureMonths);
  if (!Number.isFinite(tenure) || tenure < 1 || tenure > 60) {
    return badRequest("tenureMonths must be between 1 and 60");
  }
  if (!/^\d{4}-\d{2}$/.test(String(startMonth ?? ""))) {
    return badRequest("startMonth must be in YYYY-MM format");
  }

  const scope = getCompanyScope(session);
  const companyId = requireOrgCompanyId(scope);

  const loan = await createLoan({
    companyId,
    employeeId: targetEmployeeId,
    amount: Number(amount),
    interestRate:
      interestRate === undefined || interestRate === null || interestRate === ""
        ? 0
        : Number(interestRate),
    tenureMonths: tenure,
    startMonth: String(startMonth),
    purpose: purpose ? String(purpose) : undefined,
    note: note ? String(note) : undefined,
    requestedById: session.employeeId ?? null,
    requestedByName: authorName(session),
  });

  if (companyId) {
    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { firstName: true, lastName: true },
    });
    const requestedFor = employee ? fullName(employee.firstName, employee.lastName) : null;
    await notifyCompanyUsers(
      companyId,
      {
        type: "loan",
        title: "New loan request",
        message: `${requestedFor ?? "An employee"} requested a ${
          loan.purpose?.trim() ? `${loan.purpose.trim()} loan of ` : "loan of "
        }${Number(loan.amount).toLocaleString()} to be repaid over ${loan.tenureMonths} months.`,
        href: "/loans",
      },
      { roles: LOAN_APPROVER_ROLES }
    );
  }

  broadcastAppEvent("loan_updated", { action: "loan_created", id: loan.id });
  await audit({
    actor: session,
    module: "loans",
    action: "CREATE",
    entityId: loan.id,
    entityLabel: loan.purpose?.trim() || "Loan",
    meta: { amount: Number(loan.amount), tenureMonths: loan.tenureMonths, employeeId: targetEmployeeId },
  });
  revalidatePath("/loans");
  return NextResponse.json(loan);
}