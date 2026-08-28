import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee } from "@/lib/employee-access";
import { requirePeoplePage } from "@/lib/page-access";
import { canViewEmployeePayroll } from "@/lib/payroll-access";
import { EmployeeDetailContent } from "@/components/employees/employee-detail-content";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = requirePeoplePage(await getSession());

  const { id } = await params;

  if (!(await canViewEmployee(session, id))) {
    redirect(session.role === "EMPLOYEE" ? "/dashboard" : "/employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      branch: true,
      manager: true,
      directReports: true,
      user: { select: { role: true } },
      leaveRequests: { take: 5, orderBy: { createdAt: "desc" } },
      attendanceRecords: { take: 8, orderBy: { date: "desc" } },
      appraisalsAsEmployee: {
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { cycle: true },
      },
      payrollRecords: { take: 1, orderBy: { periodStart: "desc" } },
    },
  });

  if (!employee) notFound();

  const canViewSalary = await canViewEmployeePayroll(session, employee.id);

  return (
    <div>
      <PageLiveRefresh
        types={[
          "employee_updated",
          "leave_updated",
          "attendance_updated",
          "payroll_updated",
          "performance_updated",
          "checklist_updated",
        ]}
      />
      <EmployeeDetailContent employee={employee} canViewSalary={canViewSalary} />
    </div>
  );
}
