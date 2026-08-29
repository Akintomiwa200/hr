import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageEmployees } from "@/lib/auth";
import {
  listOffboardedEmployees,
  deleteExpiredOffboardedEmployees,
} from "@/lib/offboarding/cleanup";
import { getOffboardingSettings } from "@/lib/offboarding-settings";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Real-time cleanup: purge any offboarded staff whose retention window lapsed.
  const purge = await deleteExpiredOffboardedEmployees(session.companyId);

  const employees = await listOffboardedEmployees(session.companyId);
  const settings = await getOffboardingSettings(session.companyId);

  return NextResponse.json({
    employees,
    retentionDays: settings.retentionDays,
    purge,
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageEmployees(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const purge = await deleteExpiredOffboardedEmployees(session.companyId);
  const employees = await listOffboardedEmployees(session.companyId);

  return NextResponse.json({ employees, purge });
}
