import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canViewEmployeeTimeData,
  getEmployeeOrNull,
} from "@/lib/employee-access";
import { requirePeoplePage } from "@/lib/page-access";
import { normalizeRole } from "@/lib/roles";
import { EmployeeSubpageHeader } from "@/components/employees/employee-subpage-header";
import { EmployeeTimeNav } from "@/components/employees/employee-time-nav";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { ResignationModule } from "@/components/resignation/resignation-module";
import { isResignationAdmin } from "@/lib/resignation/access";
import {
  resignationListInclude,
} from "@/lib/resignation/queries";
import { RESIGNATION_ACTIVE_STATUSES } from "@/lib/resignation/service";
import { getResignationSettings } from "@/lib/resignation-settings";
import { fullName } from "@/lib/utils";

export default async function EmployeeResignationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = requirePeoplePage(await getSession());

  const { id } = await params;
  const employee = await getEmployeeOrNull(id);
  if (!employee) notFound();

  const allowed = await canViewEmployeeTimeData(session, id);
  if (!allowed) redirect("/employees");

  const [resignations, settings] = await Promise.all([
    prisma.resignation.findMany({
      where: { employeeId: id },
      include: resignationListInclude,
      orderBy: { createdAt: "desc" },
    }),
    getResignationSettings(session.companyId),
  ]);

  const admin = isResignationAdmin(normalizeRole(session.role));
  const self = session.employeeId === id;
  const ownActive = resignations.some((row) =>
    (RESIGNATION_ACTIVE_STATUSES as readonly string[]).includes(row.status)
  );

  return (
    <div>
      <PageLiveRefresh types={["resignation_updated", "employee_updated"]} />
      <EmployeeSubpageHeader
        employee={employee}
        title="Resignation"
        description="Resignation history, notice period, and exit progress"
      />
      <EmployeeTimeNav employeeId={id} active="resignation" showResignationTab />
      <ResignationModule
        resignations={resignations}
        noticePeriodDays={settings.noticePeriodDays}
        allowWithdrawal={settings.allowWithdrawal}
        canSubmit={self && !ownActive}
        currentEmployeeId={session.employeeId}
        isAdmin={admin}
        mode={self ? "self" : "org"}
      />
      {!self && !admin && (
        <p className="mt-4 text-xs text-gray-400">
          You are viewing {fullName(employee.firstName, employee.lastName)}&apos;s resignation
          records as their manager.
        </p>
      )}
    </div>
  );
}
