import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageBonuses } from "@/lib/bonuses/access";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { requireSession, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-auth";

const METHODS = [
  "FIXED",
  "PERCENT_BASE_SALARY",
  "PERCENT_GROSS",
  "PERCENT_NET",
  "MANUAL",
  "TIERED",
];

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();
  if (!session.companyId) return badRequest("Attach your account to a company first");

  const { id } = await params;
  const existing = await prisma.bonusType.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return notFound();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.calculationMethod !== undefined && !METHODS.includes(String(body.calculationMethod))) {
    return badRequest("Invalid calculation method");
  }
  if (body.name !== undefined && !String(body.name).trim()) {
    return badRequest("Plan name is required");
  }

  const type = await prisma.bonusType.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.code !== undefined && {
        code: body.code ? String(body.code).trim().toUpperCase() : null,
      }),
      ...(body.description !== undefined && {
        description: body.description ? String(body.description).trim() : null,
      }),
      ...(body.category !== undefined && {
        category: String(body.category).trim().toUpperCase(),
      }),
      ...(body.calculationMethod !== undefined && {
        calculationMethod: String(body.calculationMethod),
      }),
      ...(body.defaultAmount !== undefined && {
        defaultAmount: Math.max(0, Number(body.defaultAmount) || 0),
      }),
      ...(body.percentage !== undefined && {
        percentage: Math.max(0, Number(body.percentage) || 0),
      }),
      ...(body.base !== undefined && { base: String(body.base) }),
      ...(body.maxAmount !== undefined && { maxAmount: optionalNumber(body.maxAmount) }),
      ...(body.minServiceMonths !== undefined && {
        minServiceMonths: Math.max(0, Math.round(Number(body.minServiceMonths) || 0)),
      }),
      ...(body.taxable !== undefined && { taxable: Boolean(body.taxable) }),
      ...(body.requiresApproval !== undefined && {
        requiresApproval: Boolean(body.requiresApproval),
      }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(body.sortOrder !== undefined && { sortOrder: Math.round(Number(body.sortOrder) || 0) }),
    },
  });

  await audit({
    actor: session,
    module: "bonuses",
    action: "UPDATE",
    entityId: type.id,
    entityLabel: type.name,
  });

  broadcastAppEvent("bonus_updated", { action: "plan_updated", id: type.id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/plans");
  revalidatePath("/bonuses/settings");

  return NextResponse.json({ plan: type });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();
  if (!session.companyId) return badRequest("Attach your account to a company first");

  const { id } = await params;
  const existing = await prisma.bonusType.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return notFound();

  const awardCount = await prisma.bonusAward.count({ where: { typeId: id } });
  if (awardCount > 0) {
    await prisma.bonusType.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.bonusType.delete({ where: { id } });
  }

  await audit({
    actor: session,
    module: "bonuses",
    action: "DELETE",
    entityId: id,
    entityLabel: existing.name,
    meta: { archived: awardCount > 0 },
  });

  broadcastAppEvent("bonus_updated", { action: "plan_deleted", id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/plans");
  revalidatePath("/bonuses/settings");

  return NextResponse.json({ success: true, archived: awardCount > 0 });
}
