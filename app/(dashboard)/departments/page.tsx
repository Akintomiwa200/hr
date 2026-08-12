import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDepartments } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getOrgChartData } from "@/lib/org-chart-data";
import {
  getCompanyScope,
} from "@/lib/company-scope";
import { PageHeader } from "@/components/ui";
import { HelpLink } from "@/components/help/help-link";
import { OrgChartModule } from "@/components/departments/org-chart-module";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const scope = getCompanyScope(session);

  // Full company org chart for every role (still tenant-scoped by company).
  const orgDepartment =
    scope.isPlatformAdmin && !scope.companyId
      ? {}
      : scope.companyId
        ? { companyId: scope.companyId }
        : { OR: [{ companyId: null }, { companyId: scope.companyId }] };

  const [orgData, departments] = await Promise.all([
    getOrgChartData(scope),
    prisma.department.findMany({
      where: orgDepartment,
      include: {
        _count: {
          select: {
            employees: {
              where: {
                status: "ACTIVE",
                ...(scope.companyId ? { user: { companyId: scope.companyId } } : {}),
              },
            },
            jobs: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageLiveRefresh
        types={["employee_updated", "department_updated", "job_updated"]}
        pollIntervalMs={5000}
      />
      <PageHeader
        title="Org Chart"
        description="Full company hierarchy — filter by department only when you need a narrower view"
        action={<HelpLink slug="teams" label="Org chart guide" />}
      />
      <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading org chart…</div>}>
        <OrgChartModule
          data={orgData}
          departments={departments}
          canManage={canManageDepartments(session.role)}
          initialDepartmentId={params.dept}
          initialView={params.view === "departments" ? "departments" : "chart"}
        />
      </Suspense>
    </div>
  );
}
