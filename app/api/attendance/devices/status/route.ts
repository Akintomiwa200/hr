import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/api-auth";
import { DEVICE_ADMIN_ROLES } from "@/lib/roles";
import { prisma, isBranchModelsReady, withPrismaRetry } from "@/lib/prisma";
import { getCompanyScope, deviceCompanyWhere } from "@/lib/company-scope";
import { latestPunchBySerial } from "@/lib/zkteco/recent-punches";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lightweight live status for terminal cards — no spec/branches payload. */
export async function GET() {
  const { error, session } = await requireRoles(DEVICE_ADMIN_ROLES);
  if (error || !session) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = getCompanyScope(session);
  if (!isBranchModelsReady()) {
    return NextResponse.json({ ok: true, devices: [], at: new Date().toISOString() });
  }

  try {
    const payload = await withPrismaRetry(async () => {
      const rows = await prisma.attendanceDevice.findMany({
        where: deviceCompanyWhere(scope),
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          lastSeenAt: true,
          isActive: true,
        },
      });

      const serials = rows.map((d) => d.serialNumber).filter((sn): sn is string => Boolean(sn));
      const punches = await latestPunchBySerial(serials).catch(() => new Map());

      const devices = rows.map((d) => {
        const sn = d.serialNumber?.trim().toUpperCase() ?? "";
        const punch = sn ? punches.get(sn) : undefined;
        return {
          id: d.id,
          name: d.name,
          serialNumber: d.serialNumber,
          lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
          isActive: d.isActive,
          lastPunchAt: punch?.punchedAt.toISOString() ?? null,
          lastPunchPin: punch?.pin ?? null,
        };
      });

      return { ok: true as const, devices, at: new Date().toISOString() };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[attendance/devices/status]", error);
    return NextResponse.json({ error: "Database connection failed" }, { status: 503 });
  }
}
