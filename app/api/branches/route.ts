import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { getCompanyScope, branchCompanyWhere, requireOrgCompanyId } from "@/lib/company-scope";
import { DEFAULT_BRANCH_TIMEZONE, isKnownTimezone } from "@/lib/zkteco/timezones";

export async function GET() {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const scope = getCompanyScope(result.session!);

  try {
    const branches = await prisma.branch.findMany({
      where: branchCompanyWhere(scope),
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true, devices: true } },
      },
    });
    return NextResponse.json({ branches });
  } catch (err) {
    console.error("[api/branches GET]", err);
    return NextResponse.json({ branches: [] });
  }
}

export async function POST(request: NextRequest) {
  const result = await requireRoles(DEVICE_ADMIN_ROLES);
  if (result.error) return result.error;
  const companyId = requireOrgCompanyId(getCompanyScope(result.session!));

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const timezone =
    typeof body.timezone === "string" && isKnownTimezone(body.timezone)
      ? body.timezone
      : DEFAULT_BRANCH_TIMEZONE;

  if (!name) return badRequest("Branch name is required");
  if (!location) return badRequest("Branch location is required");

  try {
    const branch = await prisma.branch.create({
      data: {
        name,
        location,
        timezone,
        companyId,
        isActive: body.isActive !== false,
      },
      include: { _count: { select: { employees: true, devices: true } } },
    });

    broadcastAppEvent("attendance_updated", { id: branch.id, action: "branch_created" });
    return NextResponse.json({ branch });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("does not exist") || message.includes("Unknown arg") || message.includes("undefined")) {
      return NextResponse.json(
        { error: "Branch tables are not on the database yet. Restart the app so the schema can sync, then try again." },
        { status: 503 }
      );
    }
    return badRequest("A branch with that name already exists");
  }
}
