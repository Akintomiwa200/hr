import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewReports, canViewTeamReports } from "@/lib/reports/access";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";
import { getHeadcountReport, getReportFilterOptions } from "@/lib/reports/data";
import { ReportsPageHeader, ReportDetailCard, ReportsBackLink } from "@/components/reports/report-detail-shell";
import { ReportsHeadcountFilters } from "@/components/reports/reports-headcount-filters";
import { ReportsDownloadButton } from "@/components/reports/reports-download-button";
import { ReportsDonutChart } from "@/components/reports/reports-donut-chart";
import { ReportsDataTable } from "@/components/reports/reports-data-table";
import { EmployeeNameCell } from "@/components/reports/employee-name-cell";
import { HrStatusBadge } from "@/components/reports/hr-status-badge";

export default async function HeadcountReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewReports(session)) redirect("/dashboard");
  if (!canViewTeamReports(session)) notFound();

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const hrStatusFilter = params.status ?? "ALL";

  const dbFilters = {
    ...filters,
    status: hrStatusFilter === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
  if (["ON BOARDING", "PROBATION", "ON LEAVE", "ACTIVE"].includes(hrStatusFilter)) {
    dbFilters.status = "ACTIVE";
  }

  const [{ chart, rows }, filterOptions] = await Promise.all([
    getHeadcountReport(session, dbFilters),
    getReportFilterOptions(session),
  ]);

  let displayRows = rows;
  if (["ON BOARDING", "PROBATION", "ON LEAVE", "ACTIVE"].includes(hrStatusFilter)) {
    displayRows = rows.filter((r) => r.hrStatus === hrStatusFilter);
  } else if (hrStatusFilter === "INACTIVE") {
    displayRows = rows.filter((r) => r.hrStatus === "RESIGNED" || r.status === "INACTIVE");
  }

  return (
    <div>
      <ReportsBackLink />
      <ReportsPageHeader
        title="Headcount (Point-in-time)"
        breadcrumb={[
          { label: "List Report", href: "/reports" },
          { label: "Headcount" },
        ]}
      />

      <ReportDetailCard
        title="Headcount (Point-in-time)"
        actions={<ReportsDownloadButton exportSlug="headcount" label="Import Data" />}
      >
        <ReportsHeadcountFilters
          departments={filterOptions.departments}
          jobTitles={filterOptions.jobTitles}
          genders={filterOptions.genders}
          offices={filterOptions.offices}
        />

        <div className="py-4">
          <ReportsDonutChart segments={chart} size={240} />
        </div>

        <ReportsDataTable
          columns={[
            {
              key: "name",
              label: "Employee Name",
              sortable: true,
              render: (r) => (
                <EmployeeNameCell
                  firstName={String(r.firstName)}
                  lastName={String(r.lastName)}
                  email={String(r.email)}
                />
              ),
            },
            { key: "employeeCode", label: "Employee ID", sortable: true },
            { key: "department", label: "Department", sortable: true },
            { key: "employmentType", label: "Employee Type", sortable: true },
            { key: "office", label: "Office", sortable: true },
            { key: "jobTitle", label: "Job Title", sortable: true },
            {
              key: "hrStatus",
              label: "Status",
              sortable: true,
              render: (r) => <HrStatusBadge status={String(r.hrStatus)} />,
            },
          ]}
          rows={displayRows}
        />
      </ReportDetailCard>
    </div>
  );
}
