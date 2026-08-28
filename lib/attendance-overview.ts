import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyScope, employeeCompanyWhere, branchCompanyWhere, deviceCompanyWhere } from "@/lib/company-scope";
import { teamScopedEmployeeWhere } from "@/lib/employee-access";
import { canManageDevices } from "@/lib/roles";
import { getAttendanceWorkspace } from "@/lib/role-workspace";
import { punchActionFromStatus } from "@/lib/zkteco/protocol";
import { loadDeviceEndpoints, withDeviceEndpoint } from "@/lib/zkteco/device-endpoint-store";
import { isDeviceOnline } from "@/lib/attendance-device-spec";
import { DEFAULT_ZK_PORT } from "@/lib/zkteco/device-ip";
import { startOfDayInZone } from "@/lib/zkteco/timezone";
import { DEFAULT_BRANCH_TIMEZONE } from "@/lib/zkteco/timezones";

export type AttendanceBranch = {
  id: string;
  name: string;
  location: string;
};

export type AttendancePerson = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  biometricPin: string | null;
  branchId: string | null;
  branch: AttendanceBranch | null;
};

export type AttendanceOverviewRow = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  checkInMethod: string | null;
  checkOutMethod: string | null;
  deviceName: string | null;
  deviceId: string | null;
  employee: AttendancePerson;
  deviceBranchId: string | null;
  deviceBranchName: string | null;
};

export type AttendancePunchRow = {
  id: string;
  pin: string;
  punchedAt: string;
  createdAt: string;
  statusCode: number;
  action: "check_in" | "check_out" | "toggle";
  verifyLabel: string;
  processed: boolean;
  duplicate: boolean;
  error: string | null;
  serialNumber: string;
  deviceId: string | null;
  deviceName: string | null;
  branchId: string | null;
  branchName: string | null;
  employee: AttendancePerson | null;
};

export type AttendanceLiveDevice = {
  id: string;
  name: string;
  serialNumber: string | null;
  ipAddress: string | null;
  commPort: number;
  lastSeenAt: string | null;
  isActive: boolean;
  online: boolean;
  branchId: string | null;
  branchName: string | null;
  branchLocation: string | null;
  lastPunchAt: string | null;
  lastPunchPin: string | null;
  lastPunchName: string | null;
  todayPunchCount: number;
  todayUserCount: number;
};

export type AttendanceOverview = {
  records: AttendanceOverviewRow[];
  punches: AttendancePunchRow[];
  devices: AttendanceLiveDevice[];
  branches: AttendanceBranch[];
  presentTodayCount: number;
  todayStart: string;
  todayRecord: {
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    checkInMethod: string | null;
    checkOutMethod: string | null;
    deviceName: string | null;
  } | null;
  showPunches: boolean;
};

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function verifyLabel(verifyType: number | null | undefined) {
  if (verifyType === 1) return "Fingerprint";
  if (verifyType === 15 || verifyType === 6) return "Face";
  if (verifyType === 4) return "Card";
  if (verifyType === 2) return "PIN";
  return "Punch";
}

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
  biometricPin: true,
  branchId: true,
  branch: { select: { id: true, name: true, location: true } },
} as const;

export async function getAttendanceOverview(session: SessionUser): Promise<AttendanceOverview> {
  const workspace = getAttendanceWorkspace(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const teamScope = teamScopedEmployeeWhere(session);
  const scopedEmployee = teamScope ? { AND: [orgEmployee, teamScope] } : orgEmployee;

  const whereClause =
    workspace.mode === "self" && session.employeeId
      ? { employeeId: session.employeeId }
      : { employee: scopedEmployee };

  const showPunches = canManageDevices(session.role) && workspace.mode === "org";
  const todayStart = startOfDayInZone(DEFAULT_BRANCH_TIMEZONE);
  const today = startOfLocalDay();
  const historyStart = new Date(todayStart.getTime() - 180 * 24 * 60 * 60 * 1000);
  const punchHistoryStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [records, todaySelf, presentTodayCount, branches, devices] = await Promise.all([
    prisma.attendance.findMany({
      where: { ...whereClause, date: { gte: historyStart } },
      include: {
        employee: { select: employeeSelect },
        device: { select: { branchId: true, branch: { select: { id: true, name: true, location: true } } } },
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
      take: 400,
    }),
    session.employeeId
      ? prisma.attendance.findUnique({
          where: {
            employeeId_date: { employeeId: session.employeeId, date: today },
          },
        })
      : null,
    workspace.mode !== "self"
      ? prisma.attendance.count({
          where: {
            date: today,
            status: { in: ["PRESENT", "REMOTE", "LATE", "EARLY", "HALF_DAY"] },
            employee: scopedEmployee,
          },
        })
      : Promise.resolve(0),
    workspace.mode !== "self"
      ? prisma.branch.findMany({
          where: branchCompanyWhere(scope),
          orderBy: { name: "asc" },
          select: { id: true, name: true, location: true },
        })
      : Promise.resolve([]),
    showPunches
      ? prisma.attendanceDevice.findMany({
          where: deviceCompanyWhere(scope),
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            serialNumber: true,
            branchId: true,
            lastSeenAt: true,
            isActive: true,
            branch: { select: { id: true, name: true, location: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const serializedRecords: AttendanceOverviewRow[] = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    checkIn: r.checkIn?.toISOString() ?? null,
    checkOut: r.checkOut?.toISOString() ?? null,
    status: r.status,
    checkInMethod: r.checkInMethod,
    checkOutMethod: r.checkOutMethod,
    deviceName: r.deviceName,
    deviceId: r.deviceId,
    employee: r.employee,
    deviceBranchId: r.device?.branchId ?? null,
    deviceBranchName: r.device?.branch?.name ?? null,
  }));

  let punches: AttendancePunchRow[] = [];
  let liveDevices: AttendanceLiveDevice[] = [];
  if (showPunches && devices.length > 0) {
    const deviceIds = devices.map((d) => d.id);
    const serials = devices.map((d) => d.serialNumber).filter((sn): sn is string => Boolean(sn));
    const or: Array<{ deviceId?: { in: string[] }; serialNumber?: { in: string[] } }> = [
      { deviceId: { in: deviceIds } },
    ];
    if (serials.length > 0) or.push({ serialNumber: { in: serials } });
    const [logs, endpoints] = await Promise.all([
      prisma.attendancePunchLog.findMany({
        where: {
          OR: or,
          punchedAt: { gte: punchHistoryStart },
        },
        orderBy: [{ punchedAt: "desc" }],
        take: 1200,
        select: {
          id: true,
          pin: true,
          punchedAt: true,
          createdAt: true,
          statusCode: true,
          verifyType: true,
          processed: true,
          duplicate: true,
          error: true,
          serialNumber: true,
          deviceId: true,
          employeeId: true,
        },
      }),
      loadDeviceEndpoints(deviceIds),
    ]);

    const bySn = new Map(
      devices.map((d) => [(d.serialNumber ?? "").trim().toUpperCase(), d])
    );
    const byId = new Map(devices.map((d) => [d.id, d]));
    const employeeIds = [...new Set(logs.map((l) => l.employeeId).filter((id): id is string => Boolean(id)))];
    const people =
      employeeIds.length > 0
        ? await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: employeeSelect,
          })
        : [];
    const byEmployee = new Map(people.map((p) => [p.id, p]));

    punches = logs.map((log) => {
      const device =
        (log.deviceId && byId.get(log.deviceId)) ||
        bySn.get(log.serialNumber.trim().toUpperCase());
      const person = log.employeeId ? byEmployee.get(log.employeeId) ?? null : null;
      return {
        id: log.id,
        pin: log.pin,
        punchedAt: log.punchedAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
        statusCode: log.statusCode,
        action: punchActionFromStatus(log.statusCode),
        verifyLabel: verifyLabel(log.verifyType),
        processed: log.processed,
        duplicate: log.duplicate,
        error: log.error,
        serialNumber: log.serialNumber,
        deviceId: device?.id ?? log.deviceId ?? null,
        deviceName: device?.name ?? null,
        branchId: device?.branchId ?? null,
        branchName: device?.branch?.name ?? null,
        employee: person ?? null,
      };
    });

    const todayMs = todayStart.getTime();
    liveDevices = devices.map((device) => {
      const endpoint = withDeviceEndpoint(device, endpoints.get(device.id));
      const sn = (device.serialNumber ?? "").trim().toUpperCase();
      const fromDevice = punches.filter(
        (p) => p.deviceId === device.id || p.serialNumber.trim().toUpperCase() === sn
      );
      const serverToday = fromDevice.filter(
        (p) => new Date(p.punchedAt).getTime() >= todayMs
      );
      const latestPunchAt = fromDevice[0]?.punchedAt;
      const deviceDayStart = latestPunchAt
        ? startOfDayInZone(DEFAULT_BRANCH_TIMEZONE, new Date(latestPunchAt)).getTime()
        : todayMs;
      const todayFromDevice =
        serverToday.length > 0
          ? serverToday
          : fromDevice.filter((p) => new Date(p.punchedAt).getTime() >= deviceDayStart);
      const lastPunch = todayFromDevice[0] ?? fromDevice[0] ?? null;
      const users = new Set(
        todayFromDevice.map((p) => p.employee?.id || `pin:${p.pin}`)
      );
      return {
        id: device.id,
        name: device.name,
        serialNumber: device.serialNumber,
        ipAddress: endpoint.ipAddress,
        commPort: endpoint.commPort ?? DEFAULT_ZK_PORT,
        lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
        isActive: device.isActive,
        online: device.isActive && isDeviceOnline(device.lastSeenAt),
        branchId: device.branchId,
        branchName: device.branch?.name ?? null,
        branchLocation: device.branch?.location ?? null,
        lastPunchAt: lastPunch?.punchedAt ?? null,
        lastPunchPin: lastPunch?.pin ?? null,
        lastPunchName: lastPunch?.employee
          ? `${lastPunch.employee.firstName} ${lastPunch.employee.lastName}`.trim()
          : lastPunch
            ? `PIN ${lastPunch.pin}`
            : null,
        todayPunchCount: todayFromDevice.length,
        todayUserCount: users.size,
      };
    });
  }

  return {
    records: serializedRecords,
    punches,
    devices: liveDevices,
    branches,
    presentTodayCount,
    todayStart: todayStart.toISOString(),
    todayRecord: todaySelf
      ? {
          checkIn: todaySelf.checkIn?.toISOString() ?? null,
          checkOut: todaySelf.checkOut?.toISOString() ?? null,
          status: todaySelf.status,
          checkInMethod: todaySelf.checkInMethod,
          checkOutMethod: todaySelf.checkOutMethod,
          deviceName: todaySelf.deviceName,
        }
      : null,
    showPunches,
  };
}
