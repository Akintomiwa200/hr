import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewTeamReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getTenureReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";

export default async function TenureReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewTeamReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ rows }, { departments }] = await Promise.all([
    getTenureReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBreadcrumb
        items={[
          { label: "List Report", href: "/reports" },
          { label: "Employee Data Report", href: "/reports/employee-data/age" },
          { label: "Employee Tenure" },
        ]}
      />
      <PageHeader title="Employee Tenure" description="Length of service across employees" />
      <ReportsFiltersBar departments={departments} exportSlug="tenure" />
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          { key: "employmentType", label: "Employee Type" },
          { key: "tenure", label: "Length of Service" },
          {
            key: "hireDate",
            label: "Join Date",
            render: (r) => formatDate(String(r.hireDate)),
          },
          { key: "status", label: "Status", render: (r) => statusBadge(String(r.status)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
