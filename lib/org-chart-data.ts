import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import {
  departmentCompanyWhere,
  employeeCompanyWhere,
  getCompanyScope,
  type CompanyScope,
} from "@/lib/company-scope";
import type { SessionUser } from "@/lib/auth";

export type OrgChartNode = {
  id: string;
  name: string;
  jobTitle: string;
  avatar: string | null;
  departmentId: string;
  departmentName: string;
  role: string;
  href: string;
  children: OrgChartNode[];
};

export type OrgChartDepartment = {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
  jobCount: number;
  tree: OrgChartNode[];
};

export type OrgChartData = {
  companyName: string;
  totalEmployees: number;
  totalDepartments: number;
  totalManagers: number;
  departments: OrgChartDepartment[];
  companyTree: OrgChartNode[];
};

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  avatar: string | null;
  departmentId: string;
  managerId: string | null;
  department: { id: string; name: string };
  user: { role: string };
  directReports: { id: string }[];
};

function roleRank(role: string) {
  if (role === "COMPANY_ADMIN") return 0;
  if (role === "HR") return 1;
  if (role === "MANAGER") return 2;
  if (role === "SUPERVISOR") return 3;
  return 4;
}

function toNode(emp: EmployeeRow): OrgChartNode {
  return {
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    jobTitle: emp.jobTitle,
    avatar: emp.avatar,
    departmentId: emp.department.id,
    departmentName: emp.department.name,
    role: emp.user.role,
    href: `/employees/${emp.id}`,
    children: [],
  };
}

/**
 * Build a forest from employees. Breaks self-links and cycles so roots are never empty
 * when the pool has people.
 */
function buildForest(pool: EmployeeRow[]): OrgChartNode[] {
  if (pool.length === 0) return [];

  const poolIds = new Set(pool.map((e) => e.id));

  // parentId -> child only when manager is in pool; strip self-links
  const parent = new Map<string, string>();
  for (const emp of pool) {
    if (
      emp.managerId &&
      emp.managerId !== emp.id &&
      poolIds.has(emp.managerId)
    ) {
      parent.set(emp.id, emp.managerId);
    }
  }

  // Break cycles by dropping the edge that closes a loop
  for (const emp of pool) {
    const seen = new Set<string>();
    let cur: string | undefined = emp.id;
    while (cur && parent.has(cur)) {
      if (seen.has(cur)) {
        parent.delete(cur);
        break;
      }
      seen.add(cur);
      cur = parent.get(cur);
    }
  }

  const nodeMap = new Map(pool.map((emp) => [emp.id, toNode(emp)]));
  const roots: OrgChartNode[] = [];

  for (const emp of pool) {
    const node = nodeMap.get(emp.id)!;
    const managerId = parent.get(emp.id);
    if (managerId && nodeMap.has(managerId)) {
      nodeMap.get(managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Safety: anyone not reachable from roots (shouldn't happen) becomes a root
  const reachable = new Set<string>();
  const walk = (nodes: OrgChartNode[]) => {
    for (const n of nodes) {
      if (reachable.has(n.id)) continue;
      reachable.add(n.id);
      walk(n.children);
    }
  };
  walk(roots);
  for (const emp of pool) {
    if (!reachable.has(emp.id)) {
      roots.push(nodeMap.get(emp.id)!);
      walk([nodeMap.get(emp.id)!]);
    }
  }

  const sortNodes = (nodes: OrgChartNode[]): OrgChartNode[] =>
    [...nodes]
      .sort((a, b) => {
        const roleDiff = roleRank(a.role) - roleRank(b.role);
        if (roleDiff !== 0) return roleDiff;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));

  return sortNodes(roots);
}

/**
 * Full company = everyone.
 * Department view = members of that department + their manager chain (so the chart isn't empty
 * when managers sit in another department).
 */
function buildTreeFromEmployees(
  employees: EmployeeRow[],
  filterDepartmentId?: string
): OrgChartNode[] {
  if (!filterDepartmentId) {
    return buildForest(employees);
  }

  const byId = new Map(employees.map((e) => [e.id, e]));
  const inDept = employees.filter((e) => e.departmentId === filterDepartmentId);
  if (inDept.length === 0) return [];

  const poolIds = new Set(inDept.map((e) => e.id));
  for (const emp of inDept) {
    let cur = emp.managerId;
    const guard = new Set<string>();
    while (cur && byId.has(cur) && !guard.has(cur)) {
      guard.add(cur);
      poolIds.add(cur);
      cur = byId.get(cur)?.managerId ?? null;
    }
  }

  const pool = employees.filter((e) => poolIds.has(e.id));
  return buildForest(pool);
}

export async function getOrgChartData(
  sessionOrScope?: SessionUser | CompanyScope
): Promise<OrgChartData> {
  const scope =
    sessionOrScope && "isPlatformAdmin" in sessionOrScope
      ? sessionOrScope
      : sessionOrScope
        ? getCompanyScope(sessionOrScope)
        : { companyId: null, isPlatformAdmin: true };

  const orgEmployee = employeeCompanyWhere(scope);
  // Only departments that belong to this company (do not pull other tenants' "General").
  const orgDepartment =
    scope.isPlatformAdmin && !scope.companyId
      ? {}
      : scope.companyId
        ? { companyId: scope.companyId }
        : departmentCompanyWhere(scope);

  const [departments, employees, company] = await Promise.all([
    prisma.department.findMany({
      where: orgDepartment,
      include: {
        _count: {
          select: {
            employees: { where: { status: "ACTIVE", ...orgEmployee } },
            jobs: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE", ...orgEmployee },
      include: {
        department: true,
        user: { select: { role: true } },
        directReports: { where: { status: "ACTIVE" }, select: { id: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    scope.companyId
      ? prisma.company.findUnique({
          where: { id: scope.companyId },
          select: { name: true },
        })
      : null,
  ]);

  const employeeRows: EmployeeRow[] = employees.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    jobTitle: emp.jobTitle,
    avatar: emp.avatar,
    departmentId: emp.departmentId,
    managerId: emp.managerId,
    department: emp.department,
    user: emp.user,
    directReports: emp.directReports,
  }));

  const companyTree = buildTreeFromEmployees(employeeRows);

  // Count people with a manager/supervisor role (even before they have reports),
  // plus anyone who already has direct reports.
  const totalManagers = employeeRows.filter(
    (e) =>
      e.user.role === "MANAGER" ||
      e.user.role === "SUPERVISOR" ||
      e.directReports.length > 0
  ).length;

  const departmentCharts: OrgChartDepartment[] = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    employeeCount: dept._count.employees,
    jobCount: dept._count.jobs,
    tree: buildTreeFromEmployees(employeeRows, dept.id),
  }));

  return {
    companyName: company?.name ?? "Organization",
    totalEmployees: employees.length,
    totalDepartments: departments.length,
    totalManagers,
    departments: departmentCharts,
    companyTree:
      companyTree.length > 0
        ? companyTree
        : employeeRows.map((e) => toNode(e)),
  };
}

export function getDepartmentOrgTree(data: OrgChartData, departmentId: string) {
  return data.departments.find((dept) => dept.id === departmentId)?.tree ?? [];
}
