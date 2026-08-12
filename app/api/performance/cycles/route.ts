import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";

function cycleCompanyWhere(companyId: string | null) {
  if (!companyId) return {};
  return { OR: [{ companyId }, { companyId: null }] };
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const cycles = await prisma.appraisalCycle.findMany({
    where: cycleCompanyWhere(companyId),
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

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const scopedDeptIds = Array.isArray(departmentIds)
    ? departmentIds.filter(Boolean)
    : [];
  const scopedRoles = Array.isArray(roleFilters) ? roleFilters.filter(Boolean) : [];
  const allEmployees = includeAllEmployees !== false && scopedDeptIds.length === 0 && scopedRoles.length === 0;

  const cycle = await prisma.appraisalCycle.create({
    data: {
      companyId,
      name,
      period,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      selfReviewDeadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
      managerReviewDeadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
      includeAllEmployees: allEmployees,
      departmentIds: scopedDeptIds.length ? JSON.stringify(scopedDeptIds) : null,
      roleFilters: scopedRoles.length ? JSON.stringify(scopedRoles) : null,
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
