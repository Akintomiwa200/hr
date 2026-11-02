import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewTeamReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getBirthdayReport, getReportFilterOptions } from "@/lib/reports/data";
import { PageHeader } from "@/components/ui";
import { ReportsBreadcrumb } from "@/components/reports/reports-data-table";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { BirthdayReportSheet } from "@/components/reports/birthday-report-sheet";

export default async function BirthdayReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewTeamReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ rows }, { departments }] = await Promise.all([
    getBirthdayReport(session, filters),
    getReportFilterOptions(session),
  ]);

  return (
    <div>
      <ReportsBreadcrumb
        items={[
          { label: "List Report", href: "/reports" },
          { label: "Employee Data Report", href: "/reports/employee-data/age" },
          { label: "Birthday" },
        ]}
      />
      <PageHeader title="Birthday" description="Employee birthdays and ages" />
      <ReportsFiltersBar departments={departments} showType={false} exportSlug="birthday" />
      <BirthdayReportSheet rows={rows} />
    </div>
  );
}
