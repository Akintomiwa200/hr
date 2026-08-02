import { prisma } from "@/lib/prisma";

export type TeamPreviewMember = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  avatar: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
  jobCount: number;
  openJobCount: number;
  members: TeamPreviewMember[];
};

export type TeamsPageData = {
  teams: TeamSummary[];
  totalEmployees: number;
  totalTeams: number;
  myTeamId: string | null;
  myTeamName: string | null;
};

export async function getTeamsPageData(employeeId?: string): Promise<TeamsPageData> {
  const [departments, employee, totalEmployees] = await Promise.all([
    prisma.department.findMany({
      include: {
        employees: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            avatar: true,
          },
          orderBy: { firstName: "asc" },
          take: 6,
        },
        _count: {
          select: {
            employees: true,
            jobs: true,
          },
        },
        jobs: {
          where: { status: "OPEN" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    employeeId
      ? prisma.employee.findUnique({
          where: { id: employeeId },
          select: { departmentId: true, department: { select: { name: true } } },
        })
      : null,
    prisma.employee.count({ where: { status: "ACTIVE" } }),
  ]);

  const teams: TeamSummary[] = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    description: dept.description,
    employeeCount: dept._count.employees,
    jobCount: dept._count.jobs,
    openJobCount: dept.jobs.length,
    members: dept.employees,
  }));

  return {
    teams,
    totalEmployees,
    totalTeams: teams.length,
    myTeamId: employee?.departmentId ?? null,
    myTeamName: employee?.department.name ?? null,
  };
}

export async function getTeamDetailData(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      employees: {
        where: { status: "ACTIVE" },
        include: {
          user: { select: { role: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
        orderBy: { firstName: "asc" },
      },
      jobs: { orderBy: { postedAt: "desc" } },
    },
  });

  return department;
}
