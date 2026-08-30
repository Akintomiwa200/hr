import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, requireOrgCompanyId } from "@/lib/company-scope";
import { requireRoles, badRequest } from "@/lib/api-auth";
import { normalizeRoleInput } from "@/lib/roles-catalog";
import { revalidatePath } from "next/cache";

export async function GET() {
  const guard = await requireRoles(["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]);
  if (guard.error || !guard.session) return guard.error ?? badRequest("No session");

  const scope = getCompanyScope(guard.session);

  const roles = await prisma.roleDefinition.findMany({
    where: scope.companyId ? { companyId: scope.companyId } : {},
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(roles);
}

export async function POST(request: NextRequest) {
  const guard = await requireRoles(["SUPER_ADMIN", "COMPANY_ADMIN", "HR"]);
  if (guard.error || !guard.session) return guard.error ?? badRequest("No session");

  const companyId = requireOrgCompanyId(getCompanyScope(guard.session));
  if (!companyId) {
    return badRequest("A company is required to create roles");
  }

  const body = await request.json();
  const name = String(body.name || "").trim().toLowerCase().replace(/\s+/g, "_");
  const label = String(body.label || "").trim();
  const description = String(body.description || "").trim() || null;
  const baseRole = normalizeRoleInput(String(body.baseRole || "EMPLOYEE"));

  if (!name || !label) {
    return badRequest("Name and label are required");
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return badRequest("Role key can only contain lowercase letters, numbers, and underscores");
  }

  const existing = await prisma.roleDefinition.findFirst({
    where: { companyId, name },
  });
  if (existing) {
    return badRequest("A role with that key already exists");
  }

  const role = await prisma.roleDefinition.create({
    data: { companyId, name, label, description, baseRole, isCustom: true },
  });

  revalidatePath("/settings/roles");
  return NextResponse.json(role, { status: 201 });
}
