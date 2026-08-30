import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canManageEmployees, ALL_ROLES, roleLabel } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getCompanyScope } from "@/lib/company-scope";
import { roleDefinitionCompanyWhere } from "@/lib/roles-catalog";
import { PageHeader } from "@/components/ui";
import {
  RolesModule,
  type ManagedRole,
} from "@/components/settings/roles-module";

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageEmployees(session.role) && session.role !== "SUPER_ADMIN") {
    redirect("/settings");
  }

  const scope = getCompanyScope(session);

  const customRoles = (await prisma.roleDefinition.findMany({
    where: roleDefinitionCompanyWhere(scope),
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  })) as ManagedRole[];

  const builtinRoles = ALL_ROLES.map((role) => ({ role, label: roleLabel(role) }));

  return (
    <div className="max-w-6xl">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>
      <PageHeader
        title="Roles"
        description="View built-in roles and create custom roles that map to a base system role for permissions."
      />
      <RolesModule
        roles={customRoles}
        builtinRoles={builtinRoles}
        canManage
      />
    </div>
  );
}
