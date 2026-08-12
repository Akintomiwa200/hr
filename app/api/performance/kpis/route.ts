import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";

function kpiCompanyWhere(companyId: string | null) {
  if (!companyId) return {};
  return {
    OR: [{ companyId }, { companyId: null }],
  };
}

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const companyId = requireOrgCompanyId(getCompanyScope(session));
  const kpis = await prisma.kpiDefinition.findMany({
    where: { isActive: true, ...kpiCompanyWhere(companyId) },
    include: { department: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(kpis);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const body = await request.json();
  const { title, description, metricType, targetValue, weight, departmentId, roleFilter } = body;

  if (!title?.trim()) return badRequest("KPI title is required");

  const companyId = requireOrgCompanyId(getCompanyScope(session));

  const kpi = await prisma.kpiDefinition.create({
    data: {
      companyId,
      title: title.trim(),
      description: description || null,
      metricType: metricType || "RATING",
      targetValue: targetValue != null && targetValue !== "" ? Number(targetValue) : null,
      weight: weight != null && weight !== "" ? Number(weight) : 1,
      departmentId: departmentId || null,
      roleFilter: roleFilter || null,
    },
    include: { department: true },
  });

  revalidatePath("/performance");
  broadcastAppEvent("performance_updated", { id: kpi.id, action: "created" });
  return NextResponse.json(kpi);
}
