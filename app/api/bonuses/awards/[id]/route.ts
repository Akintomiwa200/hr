import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canApproveBonuses, canManageBonuses } from "@/lib/bonuses/access";
import { resolveBonusAmount } from "@/lib/bonuses/calculation";
import { getBonusAwardView, toBonusAwardView } from "@/lib/bonuses/queries";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";
import { fullName } from "@/lib/utils";
import { requireSession, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-auth";

const STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "SCHEDULED",
  "PAID",
  "REJECTED",
  "CANCELLED",
];

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const award = await getBonusAwardView(session, id);
  if (!award) return notFound();

  return NextResponse.json({ award });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();

  const { id } = await params;
  const existing = await prisma.bonusAward.findFirst({
    where: { id, companyId: session.companyId ?? "__none__" },
    include: { employee: true, type: true },
  });
  if (!existing) return notFound();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const nextStatus = body.status === undefined ? existing.status : String(body.status);
  if (!STATUSES.includes(nextStatus)) return badRequest("Invalid status");

  if (nextStatus === "APPROVED" || nextStatus === "REJECTED") {
    if (!canApproveBonuses(session.role)) return forbidden();
  }

  if (existing.status === "PAID" && nextStatus !== "PAID") {
    return badRequest("Paid awards cannot be moved back. Create a reversal instead.");
  }

  const EDITABLE_FIELDS = [
    "title",
    "description",
    "category",
    "reason",
    "notes",
    "typeId",
    "amount",
    "calculationMethod",
    "awardDate",
    "periodStart",
    "periodEnd",
  ];
  if (existing.status === "PAID" && EDITABLE_FIELDS.some((field) => body[field] !== undefined)) {
    return badRequest("Paid awards are locked and cannot be edited");
  }

  let amount = existing.amount;
  let calculationMethod = existing.calculationMethod;
  let baseAmount = existing.baseAmount;
  let percentage = existing.percentage;

  const nextTypeId =
    body.typeId === undefined ? existing.typeId : body.typeId ? String(body.typeId) : null;
  if (nextTypeId !== existing.typeId) {
    if (nextTypeId) {
      const type = await prisma.bonusType.findFirst({
        where: { id: nextTypeId, companyId: session.companyId! },
      });
      if (!type) return badRequest("Bonus plan not found");
    }
  }

  const type = nextTypeId
    ? await prisma.bonusType.findFirst({ where: { id: nextTypeId, companyId: session.companyId! } })
    : null;

  if (body.amount !== undefined || body.typeId !== undefined || body.calculationMethod !== undefined) {
    const calculation = resolveBonusAmount({
      method: String(body.calculationMethod ?? type?.calculationMethod ?? existing.calculationMethod),
      type: type ?? {
        defaultAmount: existing.amount,
        percentage: existing.percentage ?? 0,
        base: "BASE_SALARY",
        maxAmount: null,
      },
      baseSalary: existing.employee.salary,
      manualAmount: body.amount !== undefined ? Number(body.amount) : existing.amount,
    });
    amount = calculation.amount;
    calculationMethod = calculation.calculationMethod;
    baseAmount = calculation.baseAmount;
    percentage = calculation.percentage;
  }

  if (!(amount > 0)) return badRequest("Bonus amount must be greater than zero");

  const awardDate =
    body.awardDate !== undefined ? parseDate(body.awardDate) ?? existing.awardDate : existing.awardDate;
  const periodStart =
    body.periodStart !== undefined ? parseDate(body.periodStart) : existing.periodStart;
  const periodEnd = body.periodEnd !== undefined ? parseDate(body.periodEnd) : existing.periodEnd;
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return badRequest("Period end must be after the start date");
  }

  const approved = nextStatus === "APPROVED" || nextStatus === "SCHEDULED" || nextStatus === "PAID";
  const approvalName =
    fullName(session.firstName ?? "", session.lastName ?? "") || session.email;

  const award = await prisma.bonusAward.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.description !== undefined && {
        description: body.description ? String(body.description).trim() : null,
      }),
      ...(body.category !== undefined && { category: String(body.category).toUpperCase() }),
      ...(body.reason !== undefined && {
        reason: body.reason ? String(body.reason).trim() : null,
      }),
      ...(body.notes !== undefined && { notes: body.notes ? String(body.notes).trim() : null }),
      ...(body.typeId !== undefined && { typeId: nextTypeId }),
      ...(body.amount !== undefined || body.typeId !== undefined || body.calculationMethod !== undefined
        ? { amount, calculationMethod, baseAmount, percentage }
        : {}),
      ...(body.awardDate !== undefined && { awardDate }),
      ...(body.periodStart !== undefined && { periodStart }),
      ...(body.periodEnd !== undefined && { periodEnd }),
      status: nextStatus,
      ...(nextStatus === "APPROVED" && existing.status !== "APPROVED"
        ? {
            approvedById: session.id,
            approvedByName: approvalName,
            approvedAt: new Date(),
            rejectionReason: null,
          }
        : {}),
      ...(nextStatus === "REJECTED"
        ? {
            rejectionReason: body.rejectionReason
              ? String(body.rejectionReason).trim()
              : existing.rejectionReason,
          }
        : {}),
      ...(nextStatus === "PAID" && existing.status !== "PAID" ? { paidAt: new Date() } : {}),
      ...(body.payrollRecordId !== undefined && {
        payrollRecordId: body.payrollRecordId ? String(body.payrollRecordId) : null,
      }),
    },
    include: { employee: { include: { department: true } }, type: true },
  });

  if (approved && existing.status !== "APPROVED" && existing.status !== "SCHEDULED" && existing.status !== "PAID") {
    await createNotification({
      userId: award.employee.userId,
      type: "general",
      title: nextStatus === "PAID" ? "Bonus paid" : "Bonus approved",
      message:
        nextStatus === "PAID"
          ? `${award.title} has been marked paid.`
          : `${award.title} has been approved for you.`,
      href: "/bonuses/awards",
    });
  }
  if (nextStatus === "REJECTED" && existing.status !== "REJECTED") {
    await createNotification({
      userId: award.employee.userId,
      type: "general",
      title: "Bonus award update",
      message: `${award.title} was not approved.`,
      href: "/bonuses/awards",
    });
  }

  await audit({
    actor: session,
    module: "bonuses",
    action:
      nextStatus === "APPROVED"
        ? "APPROVE"
        : nextStatus === "REJECTED"
          ? "REJECT"
          : nextStatus === "CANCELLED"
            ? "CANCEL"
            : "UPDATE",
    entityId: award.id,
    entityLabel: `${fullName(award.employee.firstName, award.employee.lastName)} — ${award.title}`,
    meta: { status: nextStatus, amount: award.amount },
  });

  broadcastAppEvent("bonus_updated", { action: "award_updated", id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/awards");
  revalidatePath(`/bonuses/awards/${id}`);
  revalidatePath("/bonuses/payouts");

  return NextResponse.json({ award: toBonusAwardView(award) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();

  const { id } = await params;
  const existing = await prisma.bonusAward.findFirst({
    where: { id, companyId: session.companyId ?? "__none__" },
    include: { employee: true },
  });
  if (!existing) return notFound();
  if (existing.status === "PAID") return badRequest("Paid awards cannot be deleted");

  await prisma.bonusAward.delete({ where: { id } });

  await audit({
    actor: session,
    module: "bonuses",
    action: "DELETE",
    entityId: id,
    entityLabel: `${fullName(existing.employee.firstName, existing.employee.lastName)} — ${existing.title}`,
    meta: { amount: existing.amount, status: existing.status },
  });

  broadcastAppEvent("bonus_updated", { action: "award_deleted", id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/awards");
  revalidatePath("/bonuses/payouts");

  return NextResponse.json({ success: true });
}
