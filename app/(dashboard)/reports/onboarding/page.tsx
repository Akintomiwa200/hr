import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewTeamReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getOnboardingReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsBackLink } from "@/components/reports/report-detail-shell";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { ReportsBarChart } from "@/components/reports/reports-bar-chart";

export default async function OnboardingReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewTeamReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ chart, rows }, { departments }] = await Promise.all([
    getOnboardingReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBackLink />
      <ReportsBreadcrumb items={[{ label: "List Report", href: "/reports" }, { label: "New hires" }]} />
      <PageHeader title="New hires report" description="Employees grouped by their actual join date, with onboarding progress" />
      <ReportsFiltersBar departments={departments} showDateRange exportSlug="onboarding" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <ReportsBarChart data={chart} />
      </div>
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          { key: "employmentType", label: "Employee Type" },
          { key: "joinDate", label: "Join Date", render: (r) => formatDate(String(r.joinDate)) },
          { key: "status", label: "Status", render: (r) => statusBadge(String(r.status)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
