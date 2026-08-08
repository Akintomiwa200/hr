import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewOrgReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getGenderProfileReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { ReportsDonutChart } from "@/components/reports/reports-donut-chart";

export default async function GenderProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewOrgReports(session)) notFound();

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ chart, rows }, { departments }] = await Promise.all([
    getGenderProfileReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBreadcrumb
        items={[
          { label: "List Report", href: "/reports" },
          { label: "Employee Data Report", href: "/reports/employee-data/age" },
          { label: "Gender Profile" },
        ]}
      />
      <PageHeader title="Gender Profile" description="Gender diversity breakdown" />
      <ReportsFiltersBar departments={departments} exportSlug="gender" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <ReportsDonutChart segments={chart} />
      </div>
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          { key: "gender", label: "Gender" },
          { key: "status", label: "Status", render: (r) => statusBadge(String(r.status)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
