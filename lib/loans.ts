import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/payroll-working-days";
import type { SessionUser } from "@/lib/auth";
import { canApproveLoans, normalizeRole } from "@/lib/roles";

export type LoanStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED"
  | "CANCELLED";

export type LoanInstallmentStatus = "SCHEDULED" | "PAID" | "CANCELLED";

const MAX_TENURE_MONTHS = 60;
const MIN_AMOUNT = 1;

function shiftMonth(yearMonth: string, offset: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function loanListWhere(session: SessionUser): Prisma.LoanWhereInput {
  if (!canApproveLoans(session.role)) {
    if (session.employeeId) return { employeeId: session.employeeId };
    return { id: "__none__" };
  }
  if (normalizeRole(session.role) === "SUPER_ADMIN" && !session.companyId) return {};
  const companyId = session.companyId ?? null;
  return { OR: [{ companyId }, { companyId: null }] };
}

export async function loanAccessible(session: SessionUser, loan: { employeeId: string }) {
  if (canApproveLoans(session.role)) return true;
  return session.employeeId != null && session.employeeId === loan.employeeId;
}

export function loanReasonFor(loan: {
  purpose?: string | null;
  tenureMonths: number;
}, seq: number) {
  const label = loan.purpose?.trim() ? loan.purpose.trim() : "staff loan";
  return `Loan repayment ${seq}/${loan.tenureMonths} — ${label}`;
}

function lastInstallmentAmount(input: {
  totalRepayable: number;
  monthlyInstallment: number;
  tenureMonths: number;
}) {
  return roundMoney(
    input.totalRepayable - input.monthlyInstallment * (input.tenureMonths - 1)
  );
}

export function buildInstallmentPlan(input: {
  monthlyInstallment: number;
  tenureMonths: number;
  startMonth: string;
  totalRepayable: number;
}) {
  const tenure = Math.max(1, Math.min(MAX_TENURE_MONTHS, Math.round(input.tenureMonths)));
  const monthly = roundMoney(input.monthlyInstallment);
  const plan = Array.from({ length: tenure }, (_, i) => ({
    seq: i + 1,
    month: shiftMonth(input.startMonth, i),
    amount:
      i === tenure - 1
        ? lastInstallmentAmount({ ...input, tenureMonths: tenure })
        : monthly,
  }));
  return plan;
}

export async function listLoans(input: {
  companyId?: string | null;
  employeeId?: string;
  status?: string;
  where?: Prisma.LoanWhereInput;
}) {
  const where: Prisma.LoanWhereInput = {
    ...(input.where ?? {}),
    ...(input.companyId ? { companyId: input.companyId } : {}),
    ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.employeeId ? { employeeId: input.employeeId } : {}),
  };
  const loans = await prisma.loan.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      },
      installments: { orderBy: { seq: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return loans.map((loan) => ({
    ...loan,
    amount: Number(loan.amount),
    monthlyInstallment: Number(loan.monthlyInstallment),
    totalRepayable: Number(loan.totalRepayable),
    interestRate: Number(loan.interestRate),
    installments: loan.installments.map((item) => ({
      ...item,
      amount: Number(item.amount),
    })),
  }));
}

export async function getLoanById(id: string) {
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      },
      installments: { orderBy: { seq: "asc" } },
    },
  });
  if (!loan) return null;
  return {
    ...loan,
    amount: Number(loan.amount),
    monthlyInstallment: Number(loan.monthlyInstallment),
    totalRepayable: Number(loan.totalRepayable),
    interestRate: Number(loan.interestRate),
    installments: loan.installments.map((item) => ({
      ...item,
      amount: Number(item.amount),
    })),
  };
}

export async function createLoan(data: {
  companyId?: string | null;
  employeeId: string;
  amount: number;
  interestRate?: number;
  tenureMonths: number;
  startMonth: string;
  purpose?: string;
  note?: string;
  requestedById?: string | null;
  requestedByName: string;
}) {
  if (!data.employeeId) throw new Error("employeeId is required");
  const amount = roundMoney(data.amount);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    throw new Error(`amount must be at least ${MIN_AMOUNT}`);
  }
  const tenure = Math.round(data.tenureMonths);
  if (!Number.isFinite(tenure) || tenure < 1 || tenure > MAX_TENURE_MONTHS) {
    throw new Error(`tenure must be between 1 and ${MAX_TENURE_MONTHS} months`);
  }
  if (!/^\d{4}-\d{2}$/.test(String(data.startMonth ?? ""))) {
    throw new Error("startMonth must be in YYYY-MM format");
  }
  const rate = Math.max(0, Number(data.interestRate ?? 0));
  const totalRepayable = roundMoney(rate > 0 ? amount * (1 + rate / 100) : amount);
  const monthlyInstallment = roundMoney(totalRepayable / tenure);

  return prisma.loan.create({
    data: {
      companyId: data.companyId ?? null,
      employeeId: data.employeeId,
      amount,
      interestRate: rate,
      monthlyInstallment,
      tenureMonths: tenure,
      startMonth: data.startMonth,
      totalRepayable,
      purpose: data.purpose?.trim() || null,
      note: data.note?.trim() || null,
      requestedById: data.requestedById ?? null,
      requestedByName: data.requestedByName,
    },
    include: { installments: { orderBy: { seq: "asc" } } },
  });
}

export async function approveLoan(
  id: string,
  approver: { employeeId?: string | null; name: string }
) {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status !== "PENDING") {
    throw new Error("Only pending loans can be approved");
  }

  const plan = buildInstallmentPlan({
    monthlyInstallment: Number(loan.monthlyInstallment),
    tenureMonths: loan.tenureMonths,
    startMonth: loan.startMonth,
    totalRepayable: Number(loan.totalRepayable),
  });

  await prisma.$transaction(async (tx) => {
    for (const item of plan) {
      const installment = await tx.loanInstallment.create({
        data: {
          loanId: loan.id,
          seq: item.seq,
          month: item.month,
          amount: item.amount,
          status: "SCHEDULED",
        },
      });
      await tx.payrollDeduction.create({
        data: {
          companyId: loan.companyId,
          employeeId: loan.employeeId,
          amount: item.amount,
          reason: loanReasonFor(loan, item.seq),
          periodMonth: item.month,
          status: "PENDING",
          loanId: loan.id,
          loanInstallmentId: installment.id,
          createdById: approver.employeeId ?? null,
          createdByName: approver.name,
        },
      });
    }
    await tx.loan.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: approver.employeeId ?? null,
        approvedByName: approver.name,
        approvedAt: new Date(),
      },
    });
  });

  return getLoanById(id);
}

export async function rejectLoan(
  id: string,
  approver: { employeeId?: string | null; name: string },
  decisionNote?: string
) {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status !== "PENDING") {
    throw new Error("Only pending loans can be rejected");
  }
  return prisma.loan.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedById: approver.employeeId ?? null,
      approvedByName: approver.name,
      approvedAt: new Date(),
      decisionNote: decisionNote?.trim() || null,
    },
  });
}

export async function cancelLoan(id: string, actorName: string) {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status === "CLOSED") {
    throw new Error("Settled loans cannot be cancelled");
  }
  if (loan.status === "REJECTED" || loan.status === "CANCELLED") {
    return loan;
  }

  if (loan.status === "PENDING") {
    return prisma.loan.update({
      where: { id },
      data: { status: "CANCELLED", decisionNote: `Cancelled by ${actorName}` },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payrollDeduction.updateMany({
      where: { loanId: id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await tx.loanInstallment.updateMany({
      where: { loanId: id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    await tx.loan.update({
      where: { id },
      data: {
        status: "CANCELLED",
        decisionNote: `Cancelled by ${actorName}`,
      },
    });
  });

  return getLoanById(id);
}