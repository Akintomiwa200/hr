import { prisma } from "@/lib/prisma";
import { resolveEmploymentType } from "@/lib/employment";
import {
  getPreviousPeriod,
  parseDashboardRangeKey,
  resolveDashboardRange,
  type DashboardRangeKey,
} from "@/lib/dashboard-date-range";

function orgEmployeeWhere(companyId?: string | null) {
  if (!companyId) return {};
  return { user: { companyId } };
}

function orgDepartmentWhere(companyId?: string | null) {
  if (!companyId) return {};
  return { OR: [{ companyId }, { companyId: null }] };
}

function orgDeviceWhere(companyId?: string | null) {
  if (!companyId) return {};
  return { companyId };
}
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

export async function getHrDashboardData(
  rangeInput?: DashboardRangeKey | string,
  companyId?: string | null
) {
  const rangeKey = parseDashboardRangeKey(rangeInput);
  const period = resolveDashboardRange(rangeKey);
  const previousPeriod = getPreviousPeriod(period);
  const orgEmp = orgEmployeeWhere(companyId);
  const orgDept = orgDepartmentWhere(companyId);
  const orgDev = orgDeviceWhere(companyId);

  const today = startOfDay();
  const rangeStart = period.start;
  const rangeEnd = period.end;
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
    attendanceDevices,
    deviceUsageToday,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: orgEmp,
      include: { department: true, user: { select: { role: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.employee.count({ where: { status: "ACTIVE", ...orgEmp } }),
    prisma.leaveRequest.count({
      where: { status: "PENDING", employee: orgEmp },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { date: { gte: today } },
    }),
    prisma.job.count({
      where: {
        status: "OPEN",
        department: orgDept,
      },
    }),
    prisma.department.findMany({
      where: orgDept,
      include: { _count: { select: { employees: true } } },
    }),
    prisma.payrollRecord.findMany({
      where: {
        status: { in: ["PROCESSED", "PAID"] },
        periodStart: { gte: rangeStart, lte: rangeEnd },
        employee: orgEmp,
      },
      orderBy: { periodStart: "desc" },
    }),
    prisma.performanceAppraisal.findMany({
      where: {
        status: "COMPLETED",
        overallRating: { not: null },
        completedAt: { gte: rangeStart, lte: rangeEnd },
        employee: orgEmp,
      },
      include: { employee: true, cycle: true },
      take: 5,
      orderBy: { completedAt: "desc" },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { date: { gte: rangeStart, lte: rangeEnd } },
    }),
    prisma.employee.findMany({
      where: { hireDate: { gte: rangeStart, lte: rangeEnd }, ...orgEmp },
    }),
    getAttendanceRateForRange(rangeStart, rangeEnd),
    getAttendanceRateForRange(previousPeriod.start, previousPeriod.end),
    prisma.attendanceDevice.findMany({
      where: { isActive: true, ...orgDev },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.groupBy({
      by: ["deviceId"],
      _count: { deviceId: true },
      where: { date: { gte: today }, deviceId: { not: null } },
    }),
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
  const deviceColors = ["bg-[#7B61FF]", "bg-amber-400", "bg-teal-400", "bg-blue-400", "bg-violet-300"];
  const usageByDeviceId = new Map(
    deviceUsageToday.map((row) => [row.deviceId, row._count.deviceId])
  );
  const deviceBreakdown = attendanceDevices.map((device, index) => ({
    id: device.id,
    label: device.name,
    value: usageByDeviceId.get(device.id) ?? 0,
    color: deviceColors[index % deviceColors.length],
    online: device.lastSeenAt
      ? Date.now() - new Date(device.lastSeenAt).getTime() < 5 * 60 * 1000
      : false,
  }));
  const todayDevicesTotal = deviceBreakdown.reduce((sum, item) => sum + item.value, 0);

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

  const attendanceRate = thisMonthRate;

  const chartYear = rangeEnd.getFullYear();

  const monthlyPayroll = payrollRecords.reduce(
    (acc, record) => {
      const recordDate = new Date(record.periodStart);
      if (recordDate < rangeStart || recordDate > rangeEnd) return acc;
      const month = monthKey(recordDate);
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      acc[month].income += record.netPay;
      acc[month].expense += record.deductions;
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>
  );

  const incomeChart = CHART_MONTHS.map((month) => ({
    month,
    year: chartYear,
    income: monthlyPayroll[month]?.income ?? 0,
    expense: monthlyPayroll[month]?.expense ?? 0,
  }));

  const currentMonth = monthKey(today);
  const highlightMonth =
    (monthlyPayroll[currentMonth]?.income ?? 0) > 0
      ? currentMonth
      : CHART_MONTHS.slice()
          .reverse()
          .find((m) => (monthlyPayroll[m]?.income ?? 0) > 0) ?? currentMonth;

  const avgPerformance =
    performanceReviews.length > 0
      ? Math.round(
          (performanceReviews.reduce((sum, r) => sum + (r.overallRating ?? 0), 0) /
            performanceReviews.length /
            5) *
            100
        )
      : 0;

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
      devices: deviceBreakdown,
    },
    performanceAppraisals: performanceReviews,
    avgPerformance,
    incomeChart,
    highlightMonth,
    chartYear,
    rangeKey,
    dateRange: {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    },
  };
}

export async function getManagerDashboardData(
  managerEmployeeId: string,
  rangeInput?: DashboardRangeKey | string
) {
  const rangeKey = parseDashboardRangeKey(rangeInput);
  const period = resolveDashboardRange(rangeKey);
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
    prisma.performanceAppraisal.findMany({
      where: { managerId: managerEmployeeId },
      include: { employee: true, cycle: true },
      orderBy: { updatedAt: "desc" },
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

  const teamIds = team.map((member) => member.id);
  const rangeAttendanceRate = await getAttendanceRateForRange(
    period.start,
    period.end,
    teamIds
  );

  return {
    team,
    teamSize: team.length,
    pendingLeaves,
    teamReviews,
    pendingAppraisalReviews: teamReviews.filter((r) => r.status === "MANAGER_REVIEW").length,
    presentToday: teamAttendance,
    attendanceRate: rangeAttendanceRate,
    rangeKey,
    dateRange: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
  };
}

export async function getEmployeeDashboardData(
  employeeId: string,
  rangeInput?: DashboardRangeKey | string
) {
  const rangeKey = parseDashboardRangeKey(rangeInput);
  const period = resolveDashboardRange(rangeKey);

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
        where: { employeeId, date: { gte: period.start, lte: period.end } },
        orderBy: { date: "desc" },
      }),
      prisma.payrollRecord.findMany({
        where: { employeeId },
        orderBy: { periodStart: "desc" },
        take: 1,
      }),
      prisma.performanceAppraisal.findFirst({
        where: { employeeId },
        include: { cycle: true },
        orderBy: { updatedAt: "desc" },
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
    latestAppraisal: reviews,
    presentDays,
    rangeKey,
    dateRange: {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
  };
}

export async function getSuperAdminDashboardData() {
  const [companies, totalUsers, totalEmployees, activeCompanies] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.employee.count(),
    prisma.company.count({ where: { isActive: true } }),
  ]);

  return {
    companies,
    totalUsers,
    totalEmployees,
    activeCompanies,
  };
}

export async function getCompanyAdminDashboardData(
  rangeInput?: DashboardRangeKey | string,
  companyId?: string | null
) {
  const hr = await getHrDashboardData(rangeInput, companyId);
  const orgEmp = orgEmployeeWhere(companyId);
  const [pendingManagerReviews, connectedIntegrations, activeCycles] = await Promise.all([
    prisma.performanceAppraisal.count({
      where: { status: "MANAGER_REVIEW", employee: orgEmp },
    }),
    companyId
      ? prisma.integration.count({ where: { companyId, status: "CONNECTED" } }).catch(() => 0)
      : prisma.integration.count({ where: { status: "CONNECTED" } }).catch(() => 0),
    prisma.appraisalCycle.count({ where: { status: "ACTIVE" } }),
  ]);
  return {
    ...hr,
    pendingManagerReviews,
    connectedIntegrations,
    activeCycles,
  };
}

export const getSupervisorDashboardData = getManagerDashboardData;
