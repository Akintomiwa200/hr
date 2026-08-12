import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  forbidden,
  requireSession,
  unauthorized,
} from "@/lib/api-auth";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import {
  getPerformanceSettings,
  updatePerformanceSettings,
} from "@/lib/performance/settings";
import { canManageOrgContent } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const settings = await getPerformanceSettings(companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageOrgContent(session.role)) return forbidden();

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return forbidden();

  const body = await request.json();
  const updated = await updatePerformanceSettings(companyId, body);
  revalidatePath("/performance");
  broadcastAppEvent("settings_updated", { module: "performance", companyId });
  broadcastAppEvent("performance_updated", { action: "settings" });
  return NextResponse.json(updated);
}
