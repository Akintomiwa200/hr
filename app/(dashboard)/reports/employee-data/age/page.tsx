import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewTeamReports } from "@/lib/reports/access";
import { getAgeProfileReport, getReportFilterOptions } from "@/lib/reports/data";
import { ReportDetailCard } from "@/components/reports/report-detail-shell";
import { ReportsFiltersBar } from "@/components/reports/reports-filters-bar";
import { ReportsDownloadButton } from "@/components/reports/reports-download-button";
import { ReportsDonutChart } from "@/components/reports/reports-donut-chart";
import { ReportsDataTable } from "@/components/reports/reports-data-table";
import { EmployeeNameCell } from "@/components/reports/employee-name-cell";
import { HrStatusBadge } from "@/components/reports/hr-status-badge";
import { resolveHrStatuses } from "@/lib/reports/employee-status";
import { prisma } from "@/lib/prisma";
import { parseReportFiltersFromRecord } from "@/lib/reports/scope";

export default async function AgeProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session || !canViewTeamReports(session)) redirect("/dashboard");

  const params = await searchParams;
  const filters = parseReportFiltersFromRecord(params);
  const [{ chart, rows }, filterOptions] = await Promise.all([
    getAgeProfileReport(session, filters),
    getReportFilterOptions(session),
  ]);

  const empIds = rows.map((r) => String(r.id));
  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds } },
    select: { id: true, firstName: true, lastName: true, email: true, hireDate: true, status: true },
  });
  const hrStatuses = await resolveHrStatuses(employees);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  const tableRows = rows.map((r) => {
    const emp = empMap.get(String(r.id));
    return {
      ...r,
      firstName: emp?.firstName ?? "",
      lastName: emp?.lastName ?? "",
      email: emp?.email ?? "",
      hrStatus: hrStatuses.get(String(r.id)) ?? "ACTIVE",
    };
  });

  return (
    <ReportDetailCard
      title="Age Profile"
      actions={<ReportsDownloadButton exportSlug="age" />}
    >
      <ReportsFiltersBar departments={filterOptions.departments} exportSlug={undefined} />
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
          { key: "jobTitle", label: "Job Title", sortable: true },
          { key: "age", label: "Age", sortable: true },
          {
            key: "hrStatus",
            label: "Status",
            sortable: true,
            render: (r) => <HrStatusBadge status={String(r.hrStatus)} />,
          },
        ]}
        rows={tableRows}
      />
    </ReportDetailCard>
  );
}
