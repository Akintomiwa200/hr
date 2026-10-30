import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canManageBonuses } from "@/lib/bonuses/access";
import {
  ensureBonusSettings,
  ensureDefaultBonusTypes,
  getBonusSettings,
  updateBonusSettings,
} from "@/lib/bonuses/settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isSupportedCurrency } from "@/lib/currency";
import { requireSession, unauthorized, forbidden, badRequest } from "@/lib/api-auth";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const settings = await getBonusSettings(session.companyId);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageBonuses(session.role)) return forbidden();
  if (!session.companyId) return badRequest("Attach your account to a company first");

  const body = await request.json().catch(() => ({}));

  if (body.currency !== undefined) {
    const code = String(body.currency).toUpperCase();
    if (!isSupportedCurrency(code)) return badRequest("Unsupported currency");
    body.currency = code;
  }

  if (body.defaultTypeId) {
    const type = await prisma.bonusType.findFirst({
      where: { id: String(body.defaultTypeId), companyId: session.companyId },
      select: { id: true },
    });
    if (!type) return badRequest("Selected default plan does not exist");
  }

  if (body.approverRole !== undefined) {
    const allowed = ["HR", "COMPANY_ADMIN", "MANAGER", "ACCOUNT_OFFICER"];
    if (!allowed.includes(String(body.approverRole))) {
      return badRequest("Invalid approver role");
    }
  }

  await ensureBonusSettings(session.companyId);
  const settings = await updateBonusSettings(session.companyId, body);

  if (settings.enabled) {
    await ensureDefaultBonusTypes(session.companyId);
  }

  await audit({
    actor: session,
    module: "bonuses",
    action: "SETTING",
    entityLabel: "Bonus settings",
    meta: { enabled: settings.enabled, payoutSchedule: settings.payoutSchedule },
  });

  broadcastAppEvent("settings_updated", { action: "bonus_settings_updated" });
  broadcastAppEvent("bonus_updated", { action: "settings" });
  revalidatePath("/", "layout");
  revalidatePath("/bonuses");
  revalidatePath("/bonuses/settings");
  revalidatePath("/settings");
  revalidatePath("/settings/bonuses");

  return NextResponse.json({ settings });
}
