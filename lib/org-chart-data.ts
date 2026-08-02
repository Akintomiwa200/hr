import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";

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
  if (role === "ADMIN") return 0;
  if (role === "MANAGER") return 1;
  return 2;
}

function buildTreeFromEmployees(
  employees: EmployeeRow[],
  filterDepartmentId?: string
): OrgChartNode[] {
  const pool = filterDepartmentId
    ? employees.filter((e) => e.departmentId === filterDepartmentId)
    : employees;

  if (pool.length === 0) return [];

  const poolIds = new Set(pool.map((e) => e.id));

  const toNode = (emp: EmployeeRow): OrgChartNode => ({
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    jobTitle: emp.jobTitle,
    avatar: emp.avatar,
    departmentId: emp.department.id,
    departmentName: emp.department.name,
    role: emp.user.role,
    href: `/employees/${emp.id}`,
    children: [],
  });

  const nodeMap = new Map(pool.map((emp) => [emp.id, toNode(emp)]));

  const roots: OrgChartNode[] = [];

  for (const emp of pool) {
    const node = nodeMap.get(emp.id)!;
    const managerInPool = emp.managerId && poolIds.has(emp.managerId);

    if (managerInPool) {
      nodeMap.get(emp.managerId!)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: OrgChartNode[]): OrgChartNode[] =>
    nodes
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

export async function getOrgChartData(): Promise<OrgChartData> {
  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { employees: true, jobs: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: {
        department: true,
        user: { select: { role: true } },
        directReports: { where: { status: "ACTIVE" }, select: { id: true } },
      },
      orderBy: { firstName: "asc" },
    }),
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

  const managerIds = new Set(
    employeeRows.filter((e) => e.directReports.length > 0).map((e) => e.id)
  );

  const departmentCharts: OrgChartDepartment[] = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    employeeCount: dept._count.employees,
    jobCount: dept._count.jobs,
    tree: buildTreeFromEmployees(employeeRows, dept.id),
  }));

  return {
    companyName: "Smart HR",
    totalEmployees: employees.length,
    totalDepartments: departments.length,
    totalManagers: managerIds.size,
    departments: departmentCharts,
    companyTree: buildTreeFromEmployees(employeeRows),
  };
}

export function getDepartmentOrgTree(data: OrgChartData, departmentId: string) {
  return data.departments.find((dept) => dept.id === departmentId)?.tree ?? [];
}
