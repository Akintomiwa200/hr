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
    payrollYtd,
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
    prisma.payrollRecord.aggregate({
      _sum: { grossPay: true },
      where: {
        status: { in: ["PROCESSED", "PAID"] },
        periodStart: {
          gte: new Date(today.getFullYear(), 0, 1),
          lte: today,
        },
        employee: orgEmp,
      },
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

  const spent = payrollYtd._sum.grossPay ?? 0;
  const monthsElapsed = Math.max(1, today.getMonth() + 1);
  const planned = Math.round((spent / monthsElapsed) * 12);
  const remaining = Math.max(0, planned - spent);
  const spentPercent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  const spending = { spent, planned, remaining, spentPercent };

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
    spending,
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
      where: { OR: [{ managerId: managerEmployeeId }, { managers: { some: { id: managerEmployeeId } } }], status: "ACTIVE" },
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
      where: { OR: [{ managerId: managerEmployeeId }, { managers: { some: { id: managerEmployeeId } } }], status: "ACTIVE" },
      include: { department: true, user: { select: { role: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        employee: { OR: [{ managerId: managerEmployeeId }, { managers: { some: { id: managerEmployeeId } } }] },
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
        employee: { OR: [{ managerId: managerEmployeeId }, { managers: { some: { id: managerEmployeeId } } }] },
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
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  const heatmapStart = new Date(today);
  heatmapStart.setDate(heatmapStart.getDate() - 27);
  const fourMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const nextPayout = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    companies,
    totalUsers,
    totalEmployees,
    activeCompanies,
    activeEmployees,
    employeesLastMonth,
    recentEmployees,
    pendingApprovals,
    onLeaveToday,
    openJobs,
    activeCandidates,
    hiredApps,
    rejectedApps,
    offeredApps,
    screeningCount,
    interviewCount,
    priorityJobs,
    hiredForAvg,
    departmentCounts,
    primaryBranch,
    latestPayrollRun,
    attendanceToday,
    attendanceHeatRows,
    recentHires,
    thisMonthAttendanceRate,
    lastMonthAttendanceRate,
  ] = await Promise.all([
    prisma.company.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({
      where: { status: "ACTIVE", createdAt: { lt: monthStart } },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, avatar: true },
      orderBy: { hireDate: "desc" },
      take: 5,
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.jobApplication.count({
      where: { status: { in: ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"] } },
    }),
    prisma.jobApplication.count({ where: { status: "HIRED" } }),
    prisma.jobApplication.count({ where: { status: "REJECTED" } }),
    prisma.jobApplication.count({ where: { status: "OFFER" } }),
    prisma.jobApplication.count({ where: { status: "SCREENING" } }),
    prisma.jobApplication.count({ where: { status: "INTERVIEW" } }),
    prisma.job.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        title: true,
        location: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.jobApplication.findMany({
      where: { status: "HIRED" },
      select: { appliedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { name: true, location: true },
    }),
    prisma.payrollRun.findFirst({
      orderBy: { periodEnd: "desc" },
      select: {
        id: true,
        status: true,
        periodEnd: true,
        label: true,
        employeeCount: true,
      },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { date: { gte: today } },
    }),
    prisma.attendance.findMany({
      where: {
        date: { gte: heatmapStart, lte: today },
        status: { in: ["PRESENT", "REMOTE", "LATE", "HALF_DAY"] },
      },
      select: { date: true },
    }),
    prisma.employee.findMany({
      where: { hireDate: { gte: fourMonthsAgo } },
      select: { hireDate: true },
    }),
    getAttendanceRateForRange(monthStart, today),
    getAttendanceRateForRange(prevMonthStart, prevMonthEnd),
  ]);

  const headcountGrowth =
    employeesLastMonth > 0
      ? Math.round(((activeEmployees - employeesLastMonth) / employeesLastMonth) * 100)
      : activeEmployees > 0
        ? 100
        : 0;

  const decided = hiredApps + rejectedApps;
  const acceptanceRate = decided > 0 ? Math.round((hiredApps / decided) * 100) : 0;

  const hireDurations = hiredForAvg
    .map((app) => {
      const ms = new Date(app.updatedAt).getTime() - new Date(app.appliedAt).getTime();
      return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
    })
    .filter((d) => d > 0);
  const avgHireDays =
    hireDurations.length > 0
      ? Math.round(hireDurations.reduce((a, b) => a + b, 0) / hireDurations.length)
      : 0;

  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 28; i++) {
    const d = new Date(heatmapStart);
    d.setDate(heatmapStart.getDate() + i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of attendanceHeatRows) {
    const key = startOfDay(row.date).toISOString().slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const heatValues = [...dayCounts.values()];
  const heatMax = Math.max(1, ...heatValues);
  const attendanceHeatmap = heatValues.map((v) => Math.round((v / heatMax) * 100));

  const presentToday =
    (attendanceToday.find((s) => s.status === "PRESENT")?._count.status ?? 0) +
    (attendanceToday.find((s) => s.status === "HALF_DAY")?._count.status ?? 0);
  const remoteToday =
    attendanceToday.find((s) => s.status === "REMOTE")?._count.status ?? 0;
  const lateToday =
    attendanceToday.find((s) => s.status === "LATE")?._count.status ?? 0;
  const absentToday =
    attendanceToday.find((s) => s.status === "ABSENT")?._count.status ?? 0;
  const energyTotal = Math.max(1, presentToday + remoteToday + lateToday + absentToday);
  const teamEnergy = {
    energetic: Math.round((presentToday / energyTotal) * 100),
    balanced: Math.round((remoteToday / energyTotal) * 100),
    muted: Math.round(((lateToday + absentToday) / energyTotal) * 100),
  };

  const expectedToday = Math.max(activeEmployees, 1);
  const todayAttendanceRate = Math.min(
    100,
    Math.round(((presentToday + remoteToday + lateToday) / expectedToday) * 1000) / 10
  );
  const attendanceTrend = Math.round((thisMonthAttendanceRate - lastMonthAttendanceRate) * 10) / 10;

  const performanceBars = [0, 1, 2, 3].map((offset) => {
    const start = new Date(today.getFullYear(), today.getMonth() - (3 - offset), 1);
    const end = new Date(today.getFullYear(), today.getMonth() - (2 - offset), 0, 23, 59, 59, 999);
    const count = recentHires.filter((e) => {
      if (!e.hireDate) return false;
      const d = new Date(e.hireDate);
      return d >= start && d <= end;
    }).length;
    return {
      label: start.toLocaleString("en-US", { month: "short" }),
      value: count,
    };
  });
  const perfMax = Math.max(1, ...performanceBars.map((b) => b.value));

  const deptSorted = [...departmentCounts]
    .map((d) => ({ id: d.id, name: d.name, count: d._count.employees }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
  const deptTotal = deptSorted.reduce((s, d) => s + d.count, 0) || 1;
  const departmentSplit = deptSorted.slice(0, 3).map((d) => ({
    name: d.name,
    count: d.count,
    percent: Math.round((d.count / deptTotal) * 100),
  }));

  const daysInMonth = nextPayout.getDate();
  const cycleComplete = Math.min(100, Math.round((today.getDate() / daysInMonth) * 100));

  const hqLabel = primaryBranch
    ? primaryBranch.name.toLowerCase().includes("hq")
      ? primaryBranch.name
      : `HQ ${primaryBranch.location || primaryBranch.name}`
    : companies[0]?.name
      ? `HQ ${companies[0].name}`
      : "Platform HQ";

  return {
    companies,
    totalUsers,
    totalEmployees: activeEmployees,
    activeCompanies,
    pendingApprovals,
    onLeaveToday,
    openJobs,
    activeCandidates,
    screeningCount,
    interviewCount,
    acceptanceRate,
    offeredApps,
    avgHireDays,
    headcountGrowth,
    recentEmployees,
    priorityJobs,
    departmentSplit,
    hqLabel,
    hqOpen: activeCompanies > 0,
    payroll: {
      nextPayout: nextPayout.toISOString(),
      cycleComplete,
      status: latestPayrollRun?.status ?? "DRAFT",
      label: latestPayrollRun?.label ?? null,
      employeeCount: latestPayrollRun?.employeeCount ?? 0,
    },
    attendance: {
      rate: todayAttendanceRate,
      trend: attendanceTrend,
      heatmap: attendanceHeatmap,
    },
    performanceBars: performanceBars.map((b) => ({
      ...b,
      height: Math.round((b.value / perfMax) * 100),
    })),
    teamEnergy,
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
