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

  if (session.role === "MANAGER" && session.employeeId) {
    const [data, upcomingEvents] = await Promise.all([
      getManagerDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <ManagerDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  if (session.role === "SUPERVISOR" && session.employeeId) {
    const [data, upcomingEvents] = await Promise.all([
      getSupervisorDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <SupervisorDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  if (session.role === "EMPLOYEE" && session.employeeId) {
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
