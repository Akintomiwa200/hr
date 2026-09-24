import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import {
  badRequest,
  forbidden,
  notFound,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { canApproveLoans } from "@/lib/roles";
import {
  approveLoan,
  cancelLoan,
  getLoanById,
  loanAccessible,
  rejectLoan,
} from "@/lib/loans";
import { createNotification } from "@/lib/notifications";
import { formatMonthLabel } from "@/lib/utils";
import { audit } from "@/lib/audit";

function authorName(session: {
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  const name = `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim();
  return name || session.email;
}

function loanLabel(loan: { purpose?: string | null; amount: number } | null) {
  return `${loan?.purpose?.trim() || "Loan"} (${Number(loan?.amount ?? 0).toLocaleString()})`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const loan = await getLoanById(id);
  if (!loan) return notFound();
  if (!(await loanAccessible(session, loan))) return forbidden();

  return NextResponse.json(loan);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const action = String(body?.action ?? "");

  if (action === "approve" || action === "reject") {
    if (!canApproveLoans(session.role)) return forbidden();
    const decisionNote = body?.decisionNote ? String(body.decisionNote) : undefined;

    const loan =
      action === "approve"
        ? await approveLoan(id, {
            employeeId: session.employeeId ?? null,
            name: authorName(session),
          })
        : await rejectLoan(
            id,
            { employeeId: session.employeeId ?? null, name: authorName(session) },
            decisionNote
          );

    const employee = loan
      ? await prisma.employee.findUnique({
          where: { id: loan.employeeId },
          select: { userId: true, firstName: true, lastName: true },
        })
      : null;

    if (employee?.userId) {
      await createNotification({
        userId: employee.userId,
        type: "loan",
        title: action === "approve" ? "Loan approved" : "Loan request declined",
        message:
          action === "approve"
            ? `Your ${loan?.purpose?.trim() || "staff loan"} of ${Number(
                loan?.amount ?? 0
              ).toLocaleString()} is approved. Repayments of ${Number(
                loan?.monthlyInstallment ?? 0
              ).toLocaleString()} start from ${loan ? formatMonthLabel(loan.startMonth) : ""}.`
            : "Your loan request was not approved by the approver.",
        href: "/loans",
      });
    }

    broadcastAppEvent("loan_updated", { action, id });
    await audit({
      actor: session,
      module: "loans",
      action: action === "approve" ? "APPROVE" : "REJECT",
      entityId: id,
      entityLabel: loanLabel(loan),
      meta: decisionNote ? { note: decisionNote } : undefined,
    });
    revalidatePath("/loans");
    return NextResponse.json(loan ?? { id });
  }

  if (action === "cancel") {
    const existing = await getLoanById(id);
    if (!existing) return notFound();
    const isApprover = canApproveLoans(session.role);
    const isRequester = session.employeeId != null && existing.employeeId === session.employeeId;
    if (!isApprover && !isRequester) return forbidden();

    const loan = await cancelLoan(id, authorName(session));
    await audit({
      actor: session,
      module: "loans",
      action: "CANCEL",
      entityId: id,
      entityLabel: loanLabel(existing),
    });
    broadcastAppEvent("loan_updated", { action: "cancelled", id });
    revalidatePath("/loans");
    return NextResponse.json(loan);
  }

  return badRequest("invalid action");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const existing = await getLoanById(id);
  if (!existing) return notFound();
  const isApprover = canApproveLoans(session.role);
  const isRequester = session.employeeId != null && existing.employeeId === session.employeeId;
  if (!isApprover && !isRequester) return forbidden();

  const loan = await cancelLoan(id, authorName(session));
  await audit({
    actor: session,
    module: "loans",
    action: "DELETE",
    entityId: id,
    entityLabel: loanLabel(existing),
  });
  broadcastAppEvent("loan_updated", { action: "cancelled", id });
  revalidatePath("/loans");
  return NextResponse.json(loan);
}