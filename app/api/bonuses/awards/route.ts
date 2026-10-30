import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageBonuses } from "@/lib/bonuses/access";
import { checkBonusEligibility, resolveBonusAmount } from "@/lib/bonuses/calculation";
import { listBonusAwardViews, toBonusAwardView } from "@/lib/bonuses/queries";
import { getBonusSettings } from "@/lib/bonuses/settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";
import { fullName } from "@/lib/utils";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";

const CREATE_STATUSES = ["DRAFT", "PENDING", "APPROVED"];

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function notifyApprovers(
  companyId: string,
  approverRole: string,
  awardId: string,
  title: string
) {
  const approvers = await prisma.user.findMany({
    where: { companyId, role: approverRole as never, isActive: true },
    select: { id: true },
    take: 10,
  });
  await Promise.all(
    approvers.map((approver) =>
      createNotification({
        userId: approver.id,
        type: "general",
        title: "Bonus award awaiting approval",
        message: `${title} needs your approval.`,
        href: `/bonuses/awards/${awardId}`,
      })
    )
  );
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const awards = await listBonusAwardViews(session, {
    status: searchParams.get("status") ?? undefined,
    employeeId: searchParams.get("employeeId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });

  return NextResponse.json({ awards });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();
  if (!session.companyId) return badRequest("Attach your account to a company first");

  const settings = await getBonusSettings(session.companyId);
  if (!settings.enabled) return badRequest("Enable the Bonuses module in settings first");

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const employeeId = String(body.employeeId ?? "");
  if (!employeeId) return badRequest("Select an employee");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, user: { companyId: session.companyId } },
    include: { department: true },
  });
  if (!employee) return badRequest("Employee not found in your company");

  const type = body.typeId
    ? await prisma.bonusType.findFirst({
        where: { id: String(body.typeId), companyId: session.companyId },
      })
    : null;
  if (body.typeId && !type) return badRequest("Bonus plan not found");

  const eligibility = checkBonusEligibility({
    employee: {
      status: employee.status,
      hireDate: employee.hireDate,
      employmentType: employee.employmentType,
      departmentId: employee.departmentId,
      branchId: employee.branchId,
      managerId: employee.managerId,
    },
    settings,
    type,
  });
  if (!eligibility.eligible) return badRequest(eligibility.reason ?? "Employee is not eligible");

  const method = String(body.calculationMethod ?? type?.calculationMethod ?? "MANUAL");
  const manualAmount =
    body.amount === undefined || body.amount === null || body.amount === ""
      ? null
      : Number(body.amount);

  const calculation = type
    ? resolveBonusAmount({
        method,
        type,
        baseSalary: employee.salary,
        manualAmount,
      })
    : {
        amount: Math.max(0, Number(manualAmount ?? 0)),
        baseAmount: null,
        percentage: null,
        calculationMethod: "MANUAL",
        capped: false,
      };

  const amount = Number.isFinite(calculation.amount) ? calculation.amount : 0;
  if (!(amount > 0)) return badRequest("Bonus amount must be greater than zero");

  if (settings.maxAwardAmount != null && settings.maxAwardAmount > 0 && amount > settings.maxAwardAmount) {
    return badRequest(
      `Amount exceeds the company cap of ${settings.maxAwardAmount.toLocaleString()}.`
    );
  }
  if (settings.maxPercentOfSalary != null && settings.maxPercentOfSalary > 0) {
    const cap = (employee.salary * settings.maxPercentOfSalary) / 100;
    if (cap > 0 && amount > cap) {
      return badRequest(
        `Amount exceeds ${settings.maxPercentOfSalary}% of the employee's salary.`
      );
    }
  }

  let status = String(body.status ?? (settings.approvalRequired ? "PENDING" : "APPROVED"));
  if (!CREATE_STATUSES.includes(status)) status = "PENDING";
  if (status === "APPROVED" && !canManageBonuses(session.role)) status = "PENDING";

  const awardDate = parseDate(body.awardDate) ?? new Date();
  const periodStart = parseDate(body.periodStart);
  const periodEnd = parseDate(body.periodEnd);
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return badRequest("Period end must be after the start date");
  }

  const title =
    String(body.title ?? "").trim() || type?.name || "Bonus award";
  const reason = body.reason ? String(body.reason).trim() : null;
  if (settings.requireReason && !reason) {
    return badRequest("A reason is required for this bonus");
  }

  const award = await prisma.bonusAward.create({
    data: {
      companyId: session.companyId,
      employeeId,
      typeId: type?.id ?? null,
      title,
      description: body.description ? String(body.description).trim() : null,
      category: String(body.category ?? type?.category ?? "PERFORMANCE").toUpperCase(),
      amount,
      currency: settings.currency,
      calculationMethod: calculation.calculationMethod,
      baseAmount: calculation.baseAmount,
      percentage: calculation.percentage,
      periodStart,
      periodEnd,
      awardDate,
      status,
      reason,
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      createdByName: fullName(session.firstName ?? "", session.lastName ?? "") || session.email,
      approvedById: status === "APPROVED" ? session.id : null,
      approvedByName:
        status === "APPROVED"
          ? fullName(session.firstName ?? "", session.lastName ?? "") || session.email
          : null,
      approvedAt: status === "APPROVED" ? new Date() : null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
    include: { employee: { include: { department: true } }, type: true },
  });

  if (status === "PENDING" && settings.notifyApprover) {
    await notifyApprovers(session.companyId, settings.approverRole, award.id, title);
  }
  if (status === "APPROVED" && settings.notifyEmployee) {
    await createNotification({
      userId: employee.userId,
      type: "general",
      title: "Bonus approved",
      message: `${title} has been approved for you.`,
      href: "/bonuses/awards",
    });
  }

  await audit({
    actor: session,
    module: "bonuses",
    action: "CREATE",
    entityId: award.id,
    entityLabel: `${fullName(employee.firstName, employee.lastName)} — ${title}`,
    meta: { amount, status, typeId: type?.id ?? null },
  });

  broadcastAppEvent("bonus_updated", { action: "award_created", id: award.id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/awards");
  revalidatePath("/bonuses/payouts");

  return NextResponse.json({ award: toBonusAwardView(award) }, { status: 201 });
}
