import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageBonuses } from "@/lib/bonuses/access";
import { listBonusTypeViews } from "@/lib/bonuses/queries";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";

const METHODS = [
  "FIXED",
  "PERCENT_BASE_SALARY",
  "PERCENT_GROSS",
  "PERCENT_NET",
  "MANUAL",
  "TIERED",
];

function normalizeTypeInput(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(),
    code: body.code ? String(body.code).trim().toUpperCase() : null,
    description: body.description ? String(body.description).trim() : null,
    category: String(body.category ?? "PERFORMANCE").trim().toUpperCase(),
    calculationMethod: String(body.calculationMethod ?? "FIXED"),
    defaultAmount: Number(body.defaultAmount ?? 0),
    percentage: Number(body.percentage ?? 0),
    base: String(body.base ?? "BASE_SALARY"),
    maxAmount:
      body.maxAmount === null || body.maxAmount === undefined || body.maxAmount === ""
        ? null
        : Number(body.maxAmount),
    minServiceMonths: Math.max(0, Math.round(Number(body.minServiceMonths ?? 0))),
    taxable: body.taxable !== false,
    requiresApproval: body.requiresApproval !== false,
    isActive: body.isActive !== false,
    sortOrder: Number(body.sortOrder ?? 0),
  };
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const types = await listBonusTypeViews(session);
  return NextResponse.json({ types });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();
  if (!session.companyId) return badRequest("Attach your account to a company first");

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = normalizeTypeInput(body);

  if (!input.name) return badRequest("Plan name is required");
  if (!METHODS.includes(input.calculationMethod)) return badRequest("Invalid calculation method");
  if (!Number.isFinite(input.defaultAmount) || input.defaultAmount < 0) {
    return badRequest("Default amount must be zero or more");
  }
  if (!Number.isFinite(input.percentage) || input.percentage < 0) {
    return badRequest("Percentage must be zero or more");
  }
  if (input.maxAmount != null && (!Number.isFinite(input.maxAmount) || input.maxAmount < 0)) {
    return badRequest("Cap must be zero or more");
  }

  const type = await prisma.bonusType.create({
    data: { ...input, companyId: session.companyId },
  });

  await audit({
    actor: session,
    module: "bonuses",
    action: "CREATE",
    entityId: type.id,
    entityLabel: type.name,
    meta: { calculationMethod: type.calculationMethod },
  });

  broadcastAppEvent("bonus_updated", { action: "plan_created", id: type.id });
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/plans");
  revalidatePath("/bonuses/settings");

  return NextResponse.json({ plan: type }, { status: 201 });
}
