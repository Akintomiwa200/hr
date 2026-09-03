import { prisma } from "@/lib/prisma";
import { resolveEmploymentType } from "@/lib/employment";
import { isDeviceOnline } from "@/lib/attendance-device-spec";
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
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EARLY" | "REMOTE" | "HALF_DAY";

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

function dayCountInclusive(start: Date, end: Date) {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.max(1, Math.floor((e - s) / (24 * 60 * 60 * 1000)) + 1);
}

/**
 * Attendance rate = present-day records / (active employees × days in range).
 * Caps at 100% so multi-day totals never produce bogus values like 310%.
 */
async function getAttendanceRateForRange(
  start: Date,
  end: Date,
  opts?: { companyId?: string | null; employeeIds?: string[] }
) {
  let employeeIds = opts?.employeeIds;

  if (!employeeIds) {
    const employees = await prisma.employee.findMany({
      where: {
        status: "ACTIVE",
        ...(opts?.companyId ? { user: { companyId: opts.companyId } } : {}),
      },
      select: { id: true },
    });
    employeeIds = employees.map((e) => e.id);
  }

  const totalEmployees = employeeIds.length;
  if (!totalEmployees) return 0;

  const days = dayCountInclusive(start, end);
  const expected = totalEmployees * days;

  const presentCount = await prisma.attendance.count({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: start, lte: end },
      status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
    },
  });

  return Math.min(100, Math.round((presentCount / expected) * 100));
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
    activeCandidates,
    upcomingInterviews,
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
      where: {
        date: { gte: today },
        ...(companyId ? { employee: { user: { companyId } } } : {}),
      },
    }),
    prisma.job.count({
      where: {
        status: "OPEN",
        department: orgDept,
      },
    }),
    prisma.jobApplication.count({
      where: {
        status: { in: ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"] },
        job: { department: orgDept },
      },
    }),
    prisma.interview.count({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: today },
        application: { job: { department: orgDept } },
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
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        ...(companyId ? { employee: { user: { companyId } } } : {}),
      },
    }),
    prisma.employee.findMany({
      where: { hireDate: { gte: rangeStart, lte: rangeEnd }, ...orgEmp },
    }),
    getAttendanceRateForRange(rangeStart, rangeEnd, { companyId }),
    getAttendanceRateForRange(previousPeriod.start, previousPeriod.end, { companyId }),
    prisma.attendanceDevice.findMany({
      where: { isActive: true, ...orgDev },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.groupBy({
      by: ["deviceId"],
      _count: { deviceId: true },
      where: {
        date: { gte: today },
        deviceId: { not: null },
        ...(companyId ? { employee: { user: { companyId } } } : {}),
      },
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
    online: isDeviceOnline(device.lastSeenAt),
  }));
  const todayDevicesTotal = deviceBreakdown.reduce((sum, item) => sum + item.value, 0);

  const attendanceTrend = thisMonthRate - lastMonthRate;

  // Live today breakdown (not fake stored mins)
  const todayAbsent =
    todayAttendanceByStatus.find((s) => s.status === "ABSENT")?._count.status ?? 0;
  const todayOnTime =
    (todayAttendanceByStatus.find((s) => s.status === "PRESENT")?._count.status ?? 0) +
    (todayAttendanceByStatus.find((s) => s.status === "REMOTE")?._count.status ?? 0);
  const todayLateCount =
    todayAttendanceByStatus.find((s) => s.status === "LATE")?._count.status ?? 0;
  const todayHalf =
    todayAttendanceByStatus.find((s) => s.status === "HALF_DAY")?._count.status ?? 0;
  const todayLogged = todayAbsent + todayOnTime + todayLateCount + todayHalf;
  const todayExpected = Math.max(activeEmployees.length, 1);
  const todayRate = Math.min(
    100,
    Math.round(((todayOnTime + todayLateCount + todayHalf) / todayExpected) * 100)
  );

  // Period composition for the bar (real shares, zeros allowed)
  const periodAbsent =
    attendanceByStatus.find((s) => s.status === "ABSENT")?._count.status ?? 0;
  const periodOnTime =
    (attendanceByStatus.find((s) => s.status === "PRESENT")?._count.status ?? 0) +
    (attendanceByStatus.find((s) => s.status === "REMOTE")?._count.status ?? 0);
  const periodLate =
    attendanceByStatus.find((s) => s.status === "LATE")?._count.status ?? 0;
  const periodHalf =
    attendanceByStatus.find((s) => s.status === "HALF_DAY")?._count.status ?? 0;
  const periodTotal = periodAbsent + periodOnTime + periodLate + periodHalf;
  const share = (n: number) => (periodTotal > 0 ? Math.round((n / periodTotal) * 100) : 0);

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
    activeCandidates,
    upcomingInterviews,
    departmentCounts,
    attendanceRate,
    attendanceTrend,
    todayAttendanceRate: todayRate,
    todayLogged,
    attendanceBreakdown: {
      absent: share(periodAbsent),
      late: share(periodLate),
      onTime: share(periodOnTime + periodHalf),
      counts: {
        absent: periodAbsent,
        late: periodLate,
        onTime: periodOnTime + periodHalf,
        total: periodTotal,
      },
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

  const manager = await prisma.employee.findUnique({
    where: { id: managerEmployeeId },
    select: {
      id: true,
      departmentId: true,
      user: { select: { companyId: true, role: true } },
    },
  });

  // If this manager has no reports yet, adopt unmanaged employees in their department.
  if (manager && (manager.user.role === "MANAGER" || manager.user.role === "SUPERVISOR")) {
    const existingReports = await prisma.employee.count({
      where: { managerId: managerEmployeeId, status: "ACTIVE" },
    });
    if (existingReports === 0) {
      await prisma.employee.updateMany({
        where: {
          departmentId: manager.departmentId,
          managerId: null,
          status: "ACTIVE",
          id: { not: managerEmployeeId },
          user: {
            role: "EMPLOYEE",
            ...(manager.user.companyId
              ? { companyId: manager.user.companyId }
              : {}),
          },
        },
        data: { managerId: managerEmployeeId },
      });
    }
  }

  const [team, pendingLeaves, teamReviews, teamAttendance] = await Promise.all([
    prisma.employee.findMany({
      where: { managerId: managerEmployeeId, status: "ACTIVE" },
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
  const rangeAttendanceRate = await getAttendanceRateForRange(period.start, period.end, {
    employeeIds: teamIds,
  });

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
  const today = startOfDay();

  const [
    employee,
    leaveRequests,
    attendanceRecords,
    todayAttendance,
    attendanceSummary,
    payrollRecords,
    payrollStats,
    reviews,
  ] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, manager: true, user: { select: { email: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: period.start, lte: period.end } },
      orderBy: { date: "desc" },
    }),
    prisma.attendance.findFirst({
      where: { employeeId, date: { gte: today } },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { employeeId, date: { gte: period.start, lte: period.end } },
    }),
    prisma.payrollRecord.findMany({
      where: { employeeId },
      orderBy: { periodStart: "desc" },
      take: 12,
    }),
    prisma.payrollRecord.aggregate({
      where: { employeeId, status: { in: ["PROCESSED", "PAID"] } },
      _sum: { grossPay: true, deductions: true, netPay: true },
      _count: { _all: true },
    }),
    prisma.performanceAppraisal.findMany({
      where: { employeeId, status: "COMPLETED", overallRating: { not: null } },
      include: { cycle: true },
      orderBy: { completedAt: "desc" },
      take: 3,
    }),
  ]);

  const presentDays = attendanceRecords.filter((a) =>
    ["PRESENT", "REMOTE"].includes(a.status)
  ).length;

  const summaryByStatus = new Map(
    attendanceSummary.map((row) => [row.status, row._count.status])
  );
  const count = (status: AttendanceStatus) => summaryByStatus.get(status) ?? 0;
  const onTime = count("PRESENT") + count("REMOTE");
  const late = count("LATE");
  const absent = count("ABSENT");
  const halfDay = count("HALF_DAY");
  const early = count("EARLY");
  const workedDays = onTime + late + halfDay + early;

  const latestPayroll = payrollRecords[0] ?? null;

  const leaveUsage = leaveRequests.reduce(
    (acc, leave) => {
      const key = leave.type;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    employee,
    leaveRequests,
    attendanceRecords,
    latestPayroll,
    latestAppraisal: reviews[0] ?? null,
    recentAppraisals: reviews,
    presentDays,
    attendance: {
      onTime,
      late,
      absent,
      halfDay,
      early,
      workedDays,
      total: onTime + late + absent + halfDay + early,
    },
    todayStatus: todayAttendance?.status ?? null,
    leaveUsage,
    payrollStats: {
      totalRuns: payrollStats._count._all,
      totalGross: payrollStats._sum.grossPay ?? 0,
      totalNet: payrollStats._sum.netPay ?? 0,
      totalDeductions: payrollStats._sum.deductions ?? 0,
    },
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
