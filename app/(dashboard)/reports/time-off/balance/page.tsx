import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getTimeOffBalanceReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { ReportsBreadcrumb, ReportsDataTable } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";

export default async function TimeOffBalancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ rows }, { departments }] = await Promise.all([
    getTimeOffBalanceReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBreadcrumb
        items={[
          { label: "List Report", href: "/reports" },
          { label: "Time Off", href: "/reports/time-off/balance" },
          { label: "Usage" },
        ]}
      />
      <PageHeader title="Time Off Usage" description="Approved leave used and pending requests from real leave records" />
      <ReportsFiltersBar departments={departments} showType={false} showStatus={false} exportSlug="time-off-balance" />
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "department", label: "Department" },
          { key: "jobTitle", label: "Job Title" },
          { key: "used", label: "Used (approved)" },
          { key: "requested", label: "Pending request" },
        ]}
        rows={rows}
      />
    </div>
  );
}
