import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getHrDashboardData,
  getCompanyAdminDashboardData,
  getManagerDashboardData,
  getSupervisorDashboardData,
  getEmployeeDashboardData,
  getSuperAdminDashboardData,
} from "@/lib/dashboard-data";
import { getUpcomingCalendarEvents } from "@/lib/calendar-summary";
import { parseDashboardRangeKey } from "@/lib/dashboard-date-range";
import {
  HrDashboard,
  CompanyAdminDashboard,
  ManagerDashboard,
  SupervisorDashboard,
  EmployeeDashboard,
  SuperAdminDashboard,
} from "@/components/dashboard/role-dashboards";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { range } = await searchParams;
  const rangeKey = parseDashboardRangeKey(range);
  const userName = session.firstName || "User";

  const sessionContext = {
    role: session.role,
    employeeId: session.employeeId,
    companyId: session.companyId,
  };

  if (session.role === "SUPER_ADMIN") {
    const data = await getSuperAdminDashboardData();
    return <SuperAdminDashboard data={data} userName={userName} />;
  }

  if (session.role === "COMPANY_ADMIN") {
    const [data, upcomingEvents] = await Promise.all([
      getCompanyAdminDashboardData(rangeKey, session.companyId),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return <CompanyAdminDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />;
  }

  if (session.role === "HR") {
    const [data, upcomingEvents] = await Promise.all([
      getHrDashboardData(rangeKey, session.companyId),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return <HrDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />;
  }

  if (session.role === "MANAGER") {
    if (!session.employeeId) {
      return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Your manager account is missing an employee profile. Ask HR to link your user to an
          employee record, then sign in again.
        </div>
      );
    }
    const [data, upcomingEvents] = await Promise.all([
      getManagerDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <ManagerDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  if (session.role === "SUPERVISOR") {
    if (!session.employeeId) {
      return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Your supervisor account is missing an employee profile. Ask HR to link your user to an
          employee record, then sign in again.
        </div>
      );
    }
    const [data, upcomingEvents] = await Promise.all([
      getSupervisorDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <SupervisorDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  if (session.role === "EMPLOYEE") {
    if (!session.employeeId) {
      return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 text-sm text-amber-900">
          Your employee profile could not be loaded. Contact HR for help.
        </div>
      );
    }
    const [data, upcomingEvents] = await Promise.all([
      getEmployeeDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <EmployeeDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  redirect("/login");
}
