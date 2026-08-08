import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getTimeOffScheduleReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { ReportsBreadcrumb, ReportsDataTable, statusBadge } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";

export default async function TimeOffSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ rows }, { departments }] = await Promise.all([
    getTimeOffScheduleReport(session, filters),
    getReportFilterOptions(session),
  ]);

  const typeVariant = (type: string) => {
    if (type.includes("Sick")) return "info";
    if (type.includes("Unpaid")) return "warning";
    if (type.includes("Annual")) return "neutral";
    return "success";
  };

  return (
    <div>
      <ReportsBreadcrumb
        items={[
          { label: "List Report", href: "/reports" },
          { label: "Time Off", href: "/reports/time-off/balance" },
          { label: "Schedule" },
        ]}
      />
      <PageHeader title="Time Off Schedule" description="Approved and pending leave" />
      <ReportsFiltersBar departments={departments} showType={false} showStatus={false} exportSlug="time-off-schedule" />
      <ReportsDataTable
        columns={[
          { key: "name", label: "Employee Name" },
          { key: "employeeCode", label: "Employee ID" },
          { key: "jobTitle", label: "Job Title" },
          { key: "from", label: "From", render: (r) => formatDate(String(r.from)) },
          { key: "to", label: "To", render: (r) => formatDate(String(r.to)) },
          {
            key: "type",
            label: "Type",
            render: (r) => <Badge variant={typeVariant(String(r.type))}>{String(r.type)}</Badge>,
          },
          { key: "status", label: "Employee Status", render: (r) => statusBadge(String(r.status)) },
        ]}
        rows={rows}
      />
    </div>
  );
}
