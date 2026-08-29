import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getOffboardingSettings,
  updateOffboardingSettings,
  DEFAULT_RETENTION_DAYS,
} from "@/lib/offboarding-settings";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getOffboardingSettings(session.companyId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const rawDays = body.retentionDays;
  if (rawDays === undefined) {
    return NextResponse.json(
      { error: "retentionDays is required" },
      { status: 400 }
    );
  }

  const days = Number(rawDays);
  if (!Number.isFinite(days) || days < 0 || days > 365) {
    return NextResponse.json(
      { error: "Retention days must be between 0 and 365" },
      { status: 400 }
    );
  }

  const settings = await updateOffboardingSettings(session.companyId, {
    retentionDays: days,
  });

  revalidatePath("/offboarded-staff");
  broadcastAppEvent("settings_updated", {
    action: "offboarding_retention_updated",
  });

  return NextResponse.json({
    retentionDays: settings.retentionDays,
    default: DEFAULT_RETENTION_DAYS,
  });
}
