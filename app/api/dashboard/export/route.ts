import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import {
  peopleDirectoryEmployeeWhere,
  teamScopedEmployeeWhere,
} from "@/lib/employee-access";
import { canManageEmployees, hasRole, PEOPLE_ADMIN_ROLES } from "@/lib/roles";
import { fullName } from "@/lib/utils";
import { employmentLabel, resolveEmploymentType } from "@/lib/employment";
import {
  parseDashboardRangeKey,
  resolveDashboardRange,
  formatDashboardRangeLabel,
} from "@/lib/dashboard-date-range";

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
    if (!hasRole(session.role, PEOPLE_ADMIN_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const scope = getCompanyScope(session);
    const orgEmployee = employeeCompanyWhere(scope);
    const directoryScope = await peopleDirectoryEmployeeWhere(session);
    const employeeWhere = directoryScope
      ? { AND: [orgEmployee, directoryScope] }
      : orgEmployee;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
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

  if (type === "attendance") {
    const dateParam = request.nextUrl.searchParams.get("date");
    const dayStart = dateParam ? new Date(dateParam) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const scope = getCompanyScope(session);
    const orgEmployee = employeeCompanyWhere(scope);
    const teamScope = teamScopedEmployeeWhere(session);

    let whereEmployee: Record<string, unknown> = { employee: orgEmployee };
    if (session.role === "EMPLOYEE" && session.employeeId) {
      whereEmployee = { employeeId: session.employeeId };
    } else if (teamScope) {
      whereEmployee = { employee: { AND: [orgEmployee, teamScope] } };
    }

    const records = await prisma.attendance.findMany({
      where: {
        ...whereEmployee,
        date: { gte: dayStart, lte: dayEnd },
      },
      include: { employee: true },
      orderBy: { checkIn: "asc" },
    });

    const csv = toCsv([
      ["Employee", "Job Title", "Date", "Clock In", "Clock Out", "Status", "Schedule In", "Schedule Out"],
      ...records.map((record) => [
        fullName(record.employee.firstName, record.employee.lastName),
        record.employee.jobTitle,
        record.date.toISOString().slice(0, 10),
        record.checkIn
          ? new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : "",
        record.checkOut
          ? new Date(record.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : "",
        record.status,
        "9:00 AM",
        "5:00 PM",
      ]),
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance-${dayStart.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const period = resolveDashboardRange(parseDashboardRangeKey(request.nextUrl.searchParams.get("range")));

  const [employees, leaves, attendance, payroll] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.leaveRequest.count({
      where: {
        status: "PENDING",
        createdAt: { gte: period.start, lte: period.end },
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: period.start, lte: period.end },
        status: { in: ["PRESENT", "REMOTE", "LATE"] },
      },
    }),
    prisma.payrollRecord.aggregate({
      _sum: { netPay: true, deductions: true },
      where: {
        status: { in: ["PROCESSED", "PAID"] },
        periodStart: { gte: period.start, lte: period.end },
      },
    }),
  ]);

  const csv = toCsv([
    ["Metric", "Value"],
    ["Date Range", formatDashboardRangeLabel(period.start, period.end)],
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
