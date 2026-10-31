import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { isResignationAdmin } from "@/lib/resignation/access";
import {
  getResignationSettings,
  updateResignationSettings,
  type ResignationSettingsData,
} from "@/lib/resignation-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isResignationAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getResignationSettings(session.companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isResignationAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.companyId) {
    return NextResponse.json(
      { error: "Settings are managed per company" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ResignationSettingsData>;
  const settings = await updateResignationSettings(session.companyId, body);

  broadcastAppEvent("resignation_updated", {
    action: "settings_updated",
    companyId: session.companyId,
  });
  await audit({
    actor: session,
    module: "resignation",
    action: "SETTING",
    entityId: settings.id,
    entityLabel: "Resignation settings",
    meta: { ...settings },
  });

  revalidatePath("/settings/resignation");
  revalidatePath("/resignation");

  return NextResponse.json(settings);
}
