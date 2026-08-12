import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrgChartData, getDepartmentOrgTree } from "@/lib/org-chart-data";
import { getTeamDetailData } from "@/lib/teams-data";
import { getCompanyScope } from "@/lib/company-scope";
import { DepartmentDetailModule } from "@/components/departments/department-detail-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const { id } = await params;
  const scope = getCompanyScope(session);

  const [department, orgData] = await Promise.all([
    getTeamDetailData(id, scope),
    getOrgChartData(scope),
  ]);

  if (!department) notFound();

  const departmentTree = getDepartmentOrgTree(orgData, id);
  const isMyTeam = session.employeeId
    ? department.employees.some((emp) => emp.id === session.employeeId)
    : false;

  return (
    <div>
      <PageLiveRefresh
        types={["employee_updated", "department_updated", "job_updated"]}
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
        backHref="/teams"
        backLabel="Back to teams"
        showOrgChartLink
        orgChartHref="/departments"
        hierarchyTitle="Team hierarchy"
        isMyTeam={isMyTeam}
      />
    </div>
  );
}
