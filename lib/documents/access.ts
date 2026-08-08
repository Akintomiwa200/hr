import type { SessionUser } from "@/lib/auth";
import { canManageOrgContent, normalizeRole } from "@/lib/roles";
import { parseShareTargets } from "@/lib/documents/share-groups";

type Shareable = {
  shareScope: string;
  shareTargets: string | null;
};

type EmployeeContext = {
  id: string;
  departmentId: string;
  hireDate: Date;
  status: string;
  managerId: string | null;
};

function inEmployeeGroup(groupId: string, employee: EmployeeContext): boolean {
  const now = Date.now();
  const hireMs = new Date(employee.hireDate).getTime();
  const daysSinceHire = (now - hireMs) / (1000 * 60 * 60 * 24);

  switch (groupId) {
    case "all":
      return employee.status === "ACTIVE";
    case "onboarding":
      return employee.status === "ACTIVE" && daysSinceHire <= 90;
    case "offboarding":
      return employee.status === "INACTIVE" || employee.status === "OFFBOARDING";
    case "probationary":
      return employee.status === "ACTIVE" && daysSinceHire <= 90;
    case "fulltime_unassigned":
      return employee.status === "ACTIVE" && !employee.managerId;
    default:
      return false;
  }
}

export function canManageDocuments(session: SessionUser): boolean {
  const role = normalizeRole(session.role);
  return role === "SUPER_ADMIN" || canManageOrgContent(role);
}

export function canViewSharedResource(
  session: SessionUser,
  resource: Shareable,
  employee: EmployeeContext | null
): boolean {
  if (canManageDocuments(session)) return true;

  const scope = resource.shareScope || "EVERYONE";
  const targets = parseShareTargets(resource.shareTargets);

  if (scope === "EVERYONE") return true;
  if (!employee) return false;

  if (scope === "DEPARTMENT" || scope === "OFFICE") {
    if (targets.length === 0) return true;
    return targets.includes(employee.departmentId);
  }

  if (scope === "EMPLOYEE_GROUP") {
    if (targets.length === 0) return true;
    return targets.some((groupId) => inEmployeeGroup(groupId, employee));
  }

  return true;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
