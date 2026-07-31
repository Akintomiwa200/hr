import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getHrDashboardData,
  getManagerDashboardData,
  getEmployeeDashboardData,
} from "@/lib/dashboard-data";
import {
  HrDashboard,
  ManagerDashboard,
  EmployeeDashboard,
} from "@/components/dashboard/role-dashboards";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userName = session.firstName || "User";

  if (session.role === "ADMIN") {
    const data = await getHrDashboardData();
    return <HrDashboard data={data} userName={userName} />;
  }

  if (session.role === "MANAGER" && session.employeeId) {
    const data = await getManagerDashboardData(session.employeeId);
    return <ManagerDashboard data={data} userName={userName} />;
  }

  if (session.role === "EMPLOYEE" && session.employeeId) {
    const data = await getEmployeeDashboardData(session.employeeId);
    return <EmployeeDashboard data={data} userName={userName} />;
  }

  const data = await getHrDashboardData();
  return <HrDashboard data={data} userName={userName} />;
}
