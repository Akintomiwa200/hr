import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgChartData, getDepartmentOrgTree } from "@/lib/org-chart-data";
import {
  getCompanyScope,
  departmentCompanyWhere,
  employeeCompanyWhere,
} from "@/lib/company-scope";
import { DepartmentDetailModule } from "@/components/departments/department-detail-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const orgDepartment = departmentCompanyWhere(scope);

  const companyKpiFilter = scope.companyId
    ? { OR: [{ companyId: scope.companyId }, { companyId: null as string | null }] }
    : {};

  const [department, orgData, kpis] = await Promise.all([
    prisma.department.findFirst({
      where: { id, ...orgDepartment },
      include: {
        employees: {
          where: orgEmployee,
          include: {
            user: { select: { role: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
          orderBy: { firstName: "asc" },
        },
        jobs: { orderBy: { postedAt: "desc" } },
      },
    }),
    getOrgChartData(scope),
    prisma.kpiDefinition.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ departmentId: id }, { departmentId: null }] },
          companyKpiFilter,
        ],
      },
      orderBy: { title: "asc" },
      take: 12,
    }),
  ]);

  if (!department) notFound();

  const departmentTree = getDepartmentOrgTree(orgData, id);

  return (
    <div>
      <PageLiveRefresh
        types={[
          "employee_updated",
          "department_updated",
          "job_updated",
          "performance_updated",
        ]}
        pollIntervalMs={5000}
      />
      <DepartmentDetailModule
        departmentId={department.id}
        name={department.name}
        description={department.description}
        orgTree={departmentTree}
        members={department.employees.map((emp) => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          jobTitle: emp.jobTitle,
          role: emp.user.role,
          avatar: emp.avatar,
          managerFirstName: emp.manager?.firstName ?? null,
          managerLastName: emp.manager?.lastName ?? null,
        }))}
        jobs={department.jobs.map((job) => ({
          id: job.id,
          title: job.title,
          location: job.location,
          status: job.status,
        }))}
        kpis={kpis.map((kpi) => ({
          id: kpi.id,
          title: kpi.title,
          metricType: kpi.metricType,
          targetValue: kpi.targetValue,
          scopedToDepartment: kpi.departmentId === id,
        }))}
      />
    </div>
  );
}
