import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getTurnoverReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable } from "@/components/reports/reports-data-table";
import { ReportsBackLink } from "@/components/reports/report-detail-shell";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { ReportsBarChart } from "@/components/reports/reports-bar-chart";

export default async function TurnoverReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ chart, rows }, { departments }] = await Promise.all([
    getTurnoverReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBackLink />
      <ReportsBreadcrumb items={[{ label: "List Report", href: "/reports" }, { label: "Turnover Rate" }]} />
      <PageHeader title="Employee Turnover Rate" description="Monthly exits as a percentage of employees active at the start of each month" />
      <ReportsFiltersBar departments={departments} showType showStatus showDateRange exportSlug="turnover" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <ReportsBarChart data={chart} valueSuffix="%" />
      </div>
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          { key: "employmentType", label: "Employee Type" },
          { key: "tenure", label: "Length of Service" },
          { key: "hireDate", label: "Join Date", render: (r) => formatDate(String(r.hireDate)) },
          { key: "resignDate", label: "Resign Date", render: (r) => formatDate(String(r.resignDate)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
