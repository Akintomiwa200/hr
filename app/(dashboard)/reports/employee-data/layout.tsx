import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports, canViewTeamReports } from "@/lib/reports/access";
import { employeeDataTabs } from "@/lib/reports/catalog";
import { ReportsPageHeader, ReportsBackLink } from "@/components/reports/report-detail-shell";
import { EmployeeDataSidebar } from "@/components/reports/employee-data-sidebar";

export default async function EmployeeDataLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewTeamReports(session)) redirect("/reports/time-off/balance");

  const tabs = employeeDataTabs.filter((t) => canViewOrgReports(session) || !t.orgOnly);

  return (
    <div>
      <ReportsBackLink />
      <ReportsPageHeader
        title="Employee Data Reports"
        breadcrumb={[
          { label: "List Report", href: "/reports" },
          { label: "Employee Data Report" },
        ]}
      />
      <div className="flex flex-col lg:flex-row gap-6">
        <EmployeeDataSidebar tabs={tabs} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
