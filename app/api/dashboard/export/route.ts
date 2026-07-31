import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { employmentLabel, resolveEmploymentType } from "@/lib/employment";

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "dashboard";

  if (type === "employees") {
    const employees = await prisma.employee.findMany({
      include: { department: true, user: { select: { role: true } } },
      orderBy: { firstName: "asc" },
    });

    const csv = toCsv([
      ["Employee ID", "Name", "Email", "Job Title", "Department", "Employment", "Role", "Status"],
      ...employees.map((emp) => [
        emp.employeeCode,
        fullName(emp.firstName, emp.lastName),
        emp.email,
        emp.jobTitle,
        emp.department.name,
        employmentLabel(resolveEmploymentType(emp)),
        emp.user?.role ?? "EMPLOYEE",
        emp.status,
      ]),
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="employees.csv"',
      },
    });
  }

  const [employees, leaves, attendance, payroll] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendance.count({
      where: {
        date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: { in: ["PRESENT", "REMOTE", "LATE"] },
      },
    }),
    prisma.payrollRecord.aggregate({
      _sum: { netPay: true, deductions: true },
      where: { status: { in: ["PROCESSED", "PAID"] } },
    }),
  ]);

  const csv = toCsv([
    ["Metric", "Value"],
    ["Active Employees", String(employees)],
    ["Present Today", String(attendance)],
    ["Pending Leave Requests", String(leaves)],
    ["Total Net Pay", String(payroll._sum.netPay ?? 0)],
    ["Total Deductions", String(payroll._sum.deductions ?? 0)],
    ["Exported At", new Date().toISOString()],
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="dashboard-export.csv"',
    },
  });
}
