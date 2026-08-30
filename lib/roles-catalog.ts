import type { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import type { CompanyScope } from "@/lib/company-scope";

const ORGANIZATIONAL_ROLES: Role[] = [
  "COMPANY_ADMIN",
  "HR",
  "ACCOUNT_OFFICER",
  "MANAGER",
  "SUPERVISOR",
  "EMPLOYEE",
];

/** Coerce an arbitrary value into one of the assignable organizational roles. */
export function normalizeRoleInput(role?: string | Role | null): Role {
  if (ORGANIZATIONAL_ROLES.includes(role as Role)) {
    return role as Role;
  }
  return "EMPLOYEE";
}

/** Role definitions visible to this company scope (custom roles are company-scoped). */
export function roleDefinitionCompanyWhere(
  scope: CompanyScope
): Prisma.RoleDefinitionWhereInput {
  if (scope.isPlatformAdmin && !scope.companyId) return {};
  return { companyId: scope.companyId };
}
