import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const cycles = await prisma.appraisalCycle.findMany({
    include: {
      kpis: { include: { kpi: true } },
      _count: { select: { appraisals: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(cycles);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const {
    name,
    period,
    description,
    startDate,
    endDate,
    selfReviewDeadline,
    managerReviewDeadline,
    includeAllEmployees,
    departmentIds,
    roleFilters,
    kpiIds,
  } = body;

  if (!name || !period || !startDate || !endDate) {
    return badRequest("Name, period, and dates are required");
  }

  const cycle = await prisma.appraisalCycle.create({
    data: {
      name,
      period,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      selfReviewDeadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
      managerReviewDeadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
      includeAllEmployees: includeAllEmployees !== false,
      departmentIds: departmentIds?.length ? JSON.stringify(departmentIds) : null,
      roleFilters: roleFilters?.length ? JSON.stringify(roleFilters) : null,
      kpis: {
        create: (kpiIds ?? []).map((kpiId: string) => ({ kpiId })),
      },
    },
    include: { kpis: { include: { kpi: true } } },
  });

  revalidatePath("/performance");
  broadcastAppEvent("appraisal_updated", { id: cycle.id, action: "created" });
  broadcastAppEvent("performance_updated", { id: cycle.id, action: "created" });
  return NextResponse.json(cycle);
}
