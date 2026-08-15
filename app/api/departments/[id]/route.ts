import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { badRequest, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { canManageDepartments } from "@/lib/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      employees: {
        include: { user: { select: { role: true } } },
        orderBy: { firstName: "asc" },
      },
      jobs: { orderBy: { postedAt: "desc" }, take: 10 },
      _count: { select: { employees: true, jobs: true } },
    },
  });

  if (!department) return notFound();
  return NextResponse.json(department);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDepartments(session.role)) return unauthorized();

  const { id } = await params;
  const { name, description } = await request.json();

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return notFound();

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
    include: { _count: { select: { employees: true, jobs: true } } },
  });

  if (!department.name) return badRequest("Department name is required");

  broadcastAppEvent("department_updated", { id });
  revalidatePath("/departments");
  revalidatePath("/departments/manage");
  revalidatePath("/teams");
  revalidatePath(`/departments/${id}`);
  revalidatePath(`/teams/${id}`);
  return NextResponse.json(department);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !canManageDepartments(session.role)) return unauthorized();

  const { id } = await params;
  const existing = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  if (!existing) return notFound();
  if (existing._count.employees > 0) {
    return badRequest("Cannot delete a department with employees");
  }

  await prisma.department.delete({ where: { id } });
  broadcastAppEvent("department_updated", { id });
  revalidatePath("/departments");
  revalidatePath("/departments/manage");
  revalidatePath("/teams");
  revalidatePath(`/departments/${id}`);
  revalidatePath(`/teams/${id}`);
  return NextResponse.json({ success: true });
}
