import { startOfMonth, addMonths, format } from "date-fns";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { getReportsWorkspace } from "@/lib/role-workspace";
import { leaveDays } from "@/lib/leave-utils";

export type SummaryEmployeeRow = {
  id: string;
  name: string;
  employeeCode: string | null;
  department: string | null;
  workedDays: number;
  lateDays: number;
  absentDays: number;
  approvedLeaveDays: number;
};

export type SummaryMonthReport = {
  year: number;
  month: number;
  monthLabel: string;
  scope: "org" | "team" | "self";
  attendance: {
    present: number;
    late: number;
    early: number;
    remote: number;
    halfDay: number;
    absent: number;
    totalRecords: number;
  };
  presentEmployees: number;
  leave: {
    approvedRequests: number;
    approvedDays: number;
    pending: number;
    rejected: number;
  };
  employees: SummaryEmployeeRow[];
};

const PRESENT_STATUSES = ["PRESENT", "REMOTE", "LATE", "EARLY", "HALF_DAY"];

export async function getSummaryReport(
  session: SessionUser,
  yearMonth?: string
): Promise<SummaryMonthReport> {
  const workspace = getReportsWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);
  const scopedEmployee = teamScope
    ? { AND: [orgEmployee, teamScope] }
    : orgEmployee;

  const [year, month] = (() => {
    const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth ?? ""));
    if (match) return [Number(match[1]), Number(match[2])];
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  })();

  const from = startOfMonth(new Date(year, month - 1, 1));
  const toNext = addMonths(from, 1);

  const employeeWhere =
    workspace.mode === "self" && session.employeeId
      ? { employeeId: session.employeeId }
      : { employee: scopedEmployee };

  const [attendanceByStatus, attendanceRows, leaveRequests] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["status"],
      where: { ...employeeWhere, date: { gte: from, lt: toNext } },
      _count: { _all: true },
    }),
    prisma.attendance.findMany({
      where: {
        ...employeeWhere,
        date: { gte: from, lt: toNext },
      },
      select: {
        id: true,
        status: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        ...employeeWhere,
        status: { in: ["APPROVED", "PENDING", "REJECTED"] },
        endDate: { gte: from },
        startDate: { lt: toNext },
      },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const count = (status: string) =>
    attendanceByStatus.find((row) => row.status === status)?._count._all ?? 0;

  const present = PRESENT_STATUSES.reduce((sum, s) => sum + count(s), 0);
  const attendance = {
    present: count("PRESENT"),
    late: count("LATE"),
    early: count("EARLY"),
    remote: count("REMOTE"),
    halfDay: count("HALF_DAY"),
    absent: count("ABSENT"),
    totalRecords: present + count("ABSENT"),
  };

  const presentEmployees = new Set(
    attendanceRows
      .filter((row) => PRESENT_STATUSES.includes(row.status))
      .map((row) => row.employee.id)
  ).size;

  const leave = {
    approvedRequests: leaveRequests.filter((r) => r.status === "APPROVED").length,
    approvedDays: leaveRequests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + leaveDays(r.startDate, r.endDate), 0),
    pending: leaveRequests.filter((r) => r.status === "PENDING").length,
    rejected: leaveRequests.filter((r) => r.status === "REJECTED").length,
  };

  const byEmployee = new Map<string, SummaryEmployeeRow>();
  const addEmployee = (employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string | null;
    department?: { name: string | null } | null;
  }) => {
    if (!byEmployee.has(employee.id)) {
      byEmployee.set(employee.id, {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        department: employee.department?.name ?? null,
        workedDays: 0,
        lateDays: 0,
        absentDays: 0,
        approvedLeaveDays: 0,
      });
    }
    return byEmployee.get(employee.id)!;
  };

  for (const row of attendanceRows) {
    const summary = addEmployee(row.employee);
    if (PRESENT_STATUSES.includes(row.status)) summary.workedDays += 1;
    if (row.status === "LATE") summary.lateDays += 1;
    if (row.status === "ABSENT") summary.absentDays += 1;
  }

  for (const request of leaveRequests) {
    if (request.status !== "APPROVED") continue;
    const summary = addEmployee(request.employee);
    summary.approvedLeaveDays += leaveDays(request.startDate, request.endDate);
  }

  const employees = [...byEmployee.values()].sort((a, b) => b.workedDays - a.workedDays);

  return {
    year,
    month,
    monthLabel: format(from, "MMMM yyyy"),
    scope:
      workspace.mode === "org" || workspace.mode === "admin"
        ? "org"
        : workspace.mode === "team"
          ? "team"
          : "self",
    attendance,
    presentEmployees,
    leave,
    employees,
  };
}