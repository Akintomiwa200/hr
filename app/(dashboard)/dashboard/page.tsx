import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getHrDashboardData,
  getManagerDashboardData,
  getEmployeeDashboardData,
} from "@/lib/dashboard-data";
import { getUpcomingCalendarEvents } from "@/lib/calendar-summary";
import { parseDashboardRangeKey } from "@/lib/dashboard-date-range";
import {
  HrDashboard,
  ManagerDashboard,
  EmployeeDashboard,
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

  if (session.role === "ADMIN") {
    const [data, upcomingEvents] = await Promise.all([
      getHrDashboardData(rangeKey),
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

  if (session.role === "EMPLOYEE" && session.employeeId) {
    const [data, upcomingEvents] = await Promise.all([
      getEmployeeDashboardData(session.employeeId, rangeKey),
      getUpcomingCalendarEvents(sessionContext),
    ]);
    return (
      <EmployeeDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />
    );
  }

  const [data, upcomingEvents] = await Promise.all([
    getHrDashboardData(rangeKey),
    getUpcomingCalendarEvents(sessionContext),
  ]);
  return <HrDashboard data={data} userName={userName} upcomingEvents={upcomingEvents} />;
}
