import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCompanyScope } from "@/lib/company-scope";
import { requireRoles, badRequest, notFound } from "@/lib/api-auth";
import { normalizeRoleInput } from "@/lib/roles-catalog";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRoles(["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]);
  if (guard.error || !guard.session) return guard.error ?? badRequest("No session");

  const { id } = await params;
  const scope = getCompanyScope(guard.session);

  const existing = await prisma.roleDefinition.findFirst({
    where: {
      id,
      isCustom: true,
      ...(scope.companyId ? { companyId: scope.companyId } : {}),
    },
  });
  if (!existing) return notFound();

  const body = await request.json();
  const data: {
    label?: string;
    description?: string | null;
    baseRole?: Role;
    isActive?: boolean;
  } = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return badRequest("Label cannot be empty");
    data.label = label;
  }
  if (body.description !== undefined) {
    data.description = String(body.description).trim() || null;
  }
  if (body.baseRole !== undefined) {
    data.baseRole = normalizeRoleInput(String(body.baseRole));
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  const updated = await prisma.roleDefinition.update({
    where: { id: existing.id },
    data,
  });

  revalidatePath("/settings/roles");
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRoles(["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]);
  if (guard.error || !guard.session) return guard.error ?? badRequest("No session");

  const { id } = await params;
  const scope = getCompanyScope(guard.session);

  const existing = await prisma.roleDefinition.findFirst({
    where: {
      id,
      isCustom: true,
      ...(scope.companyId ? { companyId: scope.companyId } : {}),
    },
    include: { _count: { select: { employees: true } } },
  });
  if (!existing) return notFound();
  if (existing._count.employees > 0) {
    return badRequest("This role is assigned to employees and cannot be deleted");
  }

  await prisma.roleDefinition.delete({ where: { id: existing.id } });

  revalidatePath("/settings/roles");
  return NextResponse.json({ success: true });
}
