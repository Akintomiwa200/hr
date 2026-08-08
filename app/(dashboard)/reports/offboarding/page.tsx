import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getOffboardingReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { ReportsBarChart } from "@/components/reports/reports-bar-chart";

export default async function OffboardingReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ chart, rows }, { departments }] = await Promise.all([
    getOffboardingReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBreadcrumb items={[{ label: "List Report", href: "/reports" }, { label: "Offboarding" }]} />
      <PageHeader title="Offboarding Report" description="Employee exit tracking" />
      <ReportsFiltersBar departments={departments} showDateRange exportSlug="offboarding" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <ReportsBarChart data={chart} />
      </div>
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          {
            key: "resignationDate",
            label: "Resignation Date",
            render: (r) => formatDate(String(r.resignationDate)),
          },
          { key: "lastWorkingDate", label: "Last Working Date", render: (r) => String(r.lastWorkingDate === "—" ? "—" : formatDate(String(r.lastWorkingDate))) },
          { key: "status", label: "Status", render: (r) => statusBadge(String(r.status)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
