import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManagePerformance } from "@/lib/roles";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManagePerformance(session.role)) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return notFound();

  const existing = await prisma.kpiDefinition.findFirst({ where: { id, companyId } });
  if (!existing) return notFound();

  const kpi = await prisma.kpiDefinition.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.metricType !== undefined && { metricType: body.metricType }),
      ...(body.targetValue !== undefined && {
        targetValue: body.targetValue != null ? Number(body.targetValue) : null,
      }),
      ...(body.weight !== undefined && { weight: Number(body.weight) }),
      ...(body.departmentId !== undefined && { departmentId: body.departmentId || null }),
      ...(body.roleFilter !== undefined && { roleFilter: body.roleFilter || null }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    },
    include: { department: true },
  });

  revalidatePath("/performance");
  broadcastAppEvent("performance_updated", { id });
  return NextResponse.json(kpi);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManagePerformance(session.role)) return unauthorized();

  const { id } = await params;
  const companyId = requireOrgCompanyId(getCompanyScope(session));
  if (!companyId) return notFound();
  const existing = await prisma.kpiDefinition.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return notFound();
  await prisma.kpiDefinition.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/performance");
  broadcastAppEvent("performance_updated", { id, action: "deleted" });
  return NextResponse.json({ success: true });
}
