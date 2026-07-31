import { prisma } from "@/lib/prisma";
import { resolveEmploymentType } from "@/lib/employment";

const CHART_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

async function getAttendanceRateForRange(start: Date, end: Date, employeeIds?: string[]) {
  const whereEmployee =
    employeeIds && employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {};

  const [presentCount, totalEmployees] = await Promise.all([
    prisma.attendance.count({
      where: {
        ...whereEmployee,
        date: { gte: start, lte: end },
        status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
      },
    }),
    employeeIds && employeeIds.length > 0
      ? employeeIds.length
      : prisma.employee.count({ where: { status: "ACTIVE" } }),
  ]);

  if (!totalEmployees) return 0;
  return Math.round((presentCount / totalEmployees) * 100);
}

export async function getHrDashboardData() {
  const today = startOfDay();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    employees,
    totalEmployees,
    pendingLeaves,
    todayAttendanceByStatus,
    openJobs,
    departmentCounts,
    payrollRecords,
    performanceReviews,
    attendanceByStatus,
    recentHires,
    thisMonthRate,
    lastMonthRate,
  ] = await Promise.all([
    prisma.employee.findMany({
      include: { department: true, user: { select: { role: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { date: { gte: today } },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
    }),
    prisma.payrollRecord.findMany({
      where: { status: { in: ["PROCESSED", "PAID"] } },
      orderBy: { periodStart: "desc" },
      take: 24,
    }),
    prisma.performanceReview.findMany({
      where: { status: "COMPLETED", rating: { not: null } },
      include: { employee: true },
      take: 5,
      orderBy: { reviewDate: "desc" },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { date: { gte: thirtyDaysAgo } },
    }),
    prisma.employee.findMany({
      where: { hireDate: { gte: thirtyDaysAgo } },
    }),
    getAttendanceRateForRange(thisMonthStart, today),
    getAttendanceRateForRange(lastMonthStart, lastMonthEnd),
  ]);

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");
  const fulltime = activeEmployees.filter(
    (e) => resolveEmploymentType(e) === "FULL_TIME"
  ).length;
  const freelance = activeEmployees.filter(
    (e) => resolveEmploymentType(e) === "FREELANCE"
  ).length;
  const recentFulltime = recentHires.filter(
    (e) => resolveEmploymentType(e) === "FULL_TIME"
  ).length;
  const recentFreelance = recentHires.filter(
    (e) => resolveEmploymentType(e) === "FREELANCE"
  ).length;

  const todayPresent =
    todayAttendanceByStatus.find((s) => s.status === "PRESENT")?._count.status ?? 0;
  const todayRemote =
    todayAttendanceByStatus.find((s) => s.status === "REMOTE")?._count.status ?? 0;
  const todayLate =
    todayAttendanceByStatus.find((s) => s.status === "LATE")?._count.status ?? 0;
  const todayDevicesTotal = todayPresent + todayRemote + todayLate;

  const attendanceRate = totalEmployees
    ? Math.round(
        ((todayPresent + todayRemote + todayLate) / totalEmployees) * 100
      )
    : 0;

  const attendanceTrend = thisMonthRate - lastMonthRate;

  const sickLeave =
    attendanceByStatus.find((s) => s.status === "ABSENT")?._count.status ?? 0;
  const onTime =
    attendanceByStatus.find((s) => s.status === "PRESENT")?._count.status ?? 0;
  const late =
    attendanceByStatus.find((s) => s.status === "LATE")?._count.status ?? 0;
  const remote =
    attendanceByStatus.find((s) => s.status === "REMOTE")?._count.status ?? 0;
  const totalStatus = sickLeave + onTime + late + remote || 1;

  const monthlyPayroll = payrollRecords.reduce(
    (acc, record) => {
      const month = monthKey(new Date(record.periodStart));
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      acc[month].income += record.netPay;
      acc[month].expense += record.deductions;
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>
  );

  const incomeChart = CHART_MONTHS.map((month) => ({
    month,
    income: monthlyPayroll[month]?.income ?? 0,
    expense: monthlyPayroll[month]?.expense ?? 0,
  }));

  const highlightMonth =
    CHART_MONTHS.find((m) => (monthlyPayroll[m]?.income ?? 0) > 0) ??
    monthKey(today);

  const avgPerformance =
    performanceReviews.length > 0
      ? Math.round(
          (performanceReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
            performanceReviews.length /
            5) *
            100
        )
      : 0;

  const dateRangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const dateRangeEnd = new Date(today.getFullYear(), today.getMonth(), 15);

  return {
    employees,
    totalEmployees,
    fulltime,
    freelance,
    fulltimeTrend: recentFulltime,
    freelanceTrend: recentFreelance,
    pendingLeaves,
    todayAttendance: todayPresent + todayRemote + todayLate,
    openJobs,
    departmentCounts,
    attendanceRate,
    attendanceTrend,
    attendanceBreakdown: {
      sick: Math.round((sickLeave / totalStatus) * 100),
      late: Math.round((late / totalStatus) * 100),
      onTime: Math.round(((onTime + remote) / totalStatus) * 100),
    },
    deviceStats: {
      total: todayDevicesTotal,
      present: todayPresent,
      remote: todayRemote,
      late: todayLate,
    },
    performanceReviews,
    avgPerformance,
    incomeChart,
    highlightMonth,
    dateRange: {
      start: dateRangeStart.toISOString(),
      end: dateRangeEnd.toISOString(),
    },
  };
}

export async function getManagerDashboardData(managerEmployeeId: string) {
  const today = startOfDay();

  const [team, pendingLeaves, teamReviews, teamAttendance] = await Promise.all([
    prisma.employee.findMany({
      where: { managerId: managerEmployeeId },
      include: { department: true, user: { select: { role: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        employee: { managerId: managerEmployeeId },
      },
      include: { employee: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.performanceReview.findMany({
      where: { managerId: managerEmployeeId },
      include: { employee: true },
      take: 5,
    }),
    prisma.attendance.count({
      where: {
        date: { gte: today },
        status: { in: ["PRESENT", "REMOTE", "LATE"] },
        employee: { managerId: managerEmployeeId },
      },
    }),
  ]);

  return {
    team,
    teamSize: team.length,
    pendingLeaves,
    teamReviews,
    presentToday: teamAttendance,
    attendanceRate: team.length
      ? Math.round((teamAttendance / team.length) * 100)
      : 0,
  };
}

export async function getEmployeeDashboardData(employeeId: string) {
  const thirtyDaysAgo = startOfDay();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [employee, leaveRequests, attendanceRecords, payrollRecords, reviews] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: { department: true, manager: true },
      }),
      prisma.leaveRequest.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.attendance.findMany({
        where: { employeeId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "desc" },
      }),
      prisma.payrollRecord.findMany({
        where: { employeeId },
        orderBy: { periodStart: "desc" },
        take: 1,
      }),
      prisma.performanceReview.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

  const presentDays = attendanceRecords.filter((a) =>
    ["PRESENT", "REMOTE"].includes(a.status)
  ).length;

  return {
    employee,
    leaveRequests,
    attendanceRecords,
    latestPayroll: payrollRecords[0] ?? null,
    latestReview: reviews[0] ?? null,
    presentDays,
  };
}
