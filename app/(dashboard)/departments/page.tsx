import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDepartments } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getOrgChartData } from "@/lib/org-chart-data";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { OrgChartModule } from "@/components/departments/org-chart-module";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const params = await searchParams;

  const [orgData, departments] = await Promise.all([
    getOrgChartData(),
    prisma.department.findMany({
      include: { _count: { select: { employees: true, jobs: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Org Chart"
        description="Visual hierarchy, reporting lines, and department structure"
        action={<HelpLink slug="teams" label="Org chart guide" />}
      />
      <OrgChartModule
        data={orgData}
        departments={departments}
        canManage={canManageDepartments(session.role)}
        initialDepartmentId={params.dept}
        initialView={params.view === "departments" ? "departments" : "chart"}
      />
    </div>
  );
}
