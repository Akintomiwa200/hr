import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.kpiDefinition.findUnique({ where: { id } });
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
  return NextResponse.json(kpi);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") return unauthorized();

  const { id } = await params;
  await prisma.kpiDefinition.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/performance");
  return NextResponse.json({ success: true });
}
