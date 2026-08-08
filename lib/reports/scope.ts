import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { employeeCompanyWhere, getCompanyScope } from "@/lib/company-scope";
import {
  canViewOrgReports,
  canViewTeamReports,
  getReportsScope,
} from "@/lib/reports/access";

export type ReportFilters = {
  status?: string;
  departmentId?: string;
  employmentType?: string;
  gender?: string;
  jobTitle?: string;
  office?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function buildEmployeeReportWhere(
  session: SessionUser,
  filters: ReportFilters = {}
): Promise<Prisma.EmployeeWhereInput> {
  const scope = getCompanyScope(session);
  const reportScope = getReportsScope(session);
  const base: Prisma.EmployeeWhereInput = {
    ...employeeCompanyWhere(scope),
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.departmentId && filters.departmentId !== "ALL"
      ? { departmentId: filters.departmentId }
      : {}),
    ...(filters.jobTitle && filters.jobTitle !== "ALL" ? { jobTitle: filters.jobTitle } : {}),
  };

  if (reportScope === "org") return base;

  if (reportScope === "team" && session.employeeId) {
    return {
      ...base,
      OR: [{ managerId: session.employeeId }, { id: session.employeeId }],
    };
  }

  if (session.employeeId) {
    return { ...base, id: session.employeeId };
  }

  return { ...base, id: "__none__" };
}

export function parseReportFilters(params: {
  get: (k: string) => string | null | undefined;
}): ReportFilters {
  return {
    status: params.get("status") ?? "ACTIVE",
    departmentId: params.get("departmentId") ?? "ALL",
    employmentType: params.get("employmentType") ?? "ALL",
    gender: params.get("gender") ?? "ALL",
    jobTitle: params.get("jobTitle") ?? "ALL",
    office: params.get("office") ?? "ALL",
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
  };
}

export function parseReportFiltersFromRecord(
  params: Record<string, string | undefined>
): ReportFilters {
  return parseReportFilters({ get: (k) => params[k] ?? null });
}

export function parseDateRange(filters: ReportFilters): { from: Date; to: Date } {
  const to = filters.dateTo ? new Date(filters.dateTo) : new Date();
  const from = filters.dateFrom
    ? new Date(filters.dateFrom)
    : new Date(to.getFullYear(), to.getMonth() - 2, 1);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function canAccessReport(
  session: SessionUser,
  allowedScopes: Array<"org" | "team" | "self">
): boolean {
  const current = getReportsScope(session);
  return allowedScopes.includes(current);
}

export function isOrgOnlyReport(session: SessionUser): boolean {
  return canViewOrgReports(session);
}

export function isTeamOrAbove(session: SessionUser): boolean {
  return canViewTeamReports(session);
}

export function roleLabel(session: SessionUser): string {
  const scope = getReportsScope(session);
  if (scope === "org") return "Organization";
  if (scope === "team") return "Your team";
  return "Personal";
}
