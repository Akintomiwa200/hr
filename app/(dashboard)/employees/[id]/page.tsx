import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee } from "@/lib/employee-access";
import { EmployeeDetailContent } from "@/components/employees/employee-detail-content";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  if (!(await canViewEmployee(session, id))) {
    redirect("/employees");
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: true,
      directReports: true,
      user: { select: { role: true } },
      leaveRequests: { take: 5, orderBy: { createdAt: "desc" } },
      attendanceRecords: { take: 8, orderBy: { date: "desc" } },
      performanceReviews: { take: 3, orderBy: { createdAt: "desc" } },
      payrollRecords: { take: 1, orderBy: { periodStart: "desc" } },
    },
  });

  if (!employee) notFound();

  const canViewSalary = session.role === "ADMIN" || session.employeeId === employee.id;

  return (
    <EmployeeDetailContent employee={employee} canViewSalary={canViewSalary} />
  );
}
