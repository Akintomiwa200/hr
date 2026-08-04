import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  canApproveLeave,
  canManageEmployees,
  canViewTeamScope,
  normalizeRole,
} from "@/lib/roles";
import { fullName } from "@/lib/utils";

export type NavNotification = {
  id: string;
  type: "leave" | "announcement" | "payroll" | "attendance";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

export type NavTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string;
};

export type NavSummary = {
  notificationCount: number;
  notifications: NavNotification[];
  teamMembers: NavTeamMember[];
  teamOverflowCount: number;
  pendingLeaveCount: number;
  inviteHref: string | null;
  canInvite: boolean;
  messagesHref: string;
};

const RECENT_DAYS = 14;

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getNavSummary(session: SessionUser): Promise<NavSummary> {
  const role = normalizeRole(session.role);
  const since = daysAgo(RECENT_DAYS);
  const canInvite = canManageEmployees(role);
  const isApprover = canApproveLeave(role);

  const currentEmployee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { departmentId: true },
      })
    : null;

  const [
    recentAnnouncements,
    pendingLeaves,
    myLeaveUpdates,
    recentPayroll,
    teamMembers,
    departmentPeers,
  ] = await Promise.all([
    prisma.announcement.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    isApprover
      ? prisma.leaveRequest.findMany({
          where: {
            status: "PENDING",
            ...(session.employeeId &&
            (role === "MANAGER" || role === "SUPERVISOR")
              ? { employee: { managerId: session.employeeId } }
              : {}),
          },
          include: { employee: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    session.employeeId
      ? prisma.leaveRequest.findMany({
          where: {
            employeeId: session.employeeId,
            updatedAt: { gte: since },
            status: { in: ["APPROVED", "REJECTED"] },
          },
          orderBy: { updatedAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    session.employeeId
      ? prisma.payrollRecord.findMany({
          where: {
            employeeId: session.employeeId,
            status: { in: ["PROCESSED", "PAID"] },
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        })
      : Promise.resolve([]),
    canViewTeamScope(role) && session.employeeId
      ? prisma.employee.findMany({
          where: { managerId: session.employeeId, status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            jobTitle: true,
          },
          orderBy: { firstName: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    session.employeeId && currentEmployee?.departmentId
      ? prisma.employee.findMany({
          where: {
            status: "ACTIVE",
            id: { not: session.employeeId },
            departmentId: currentEmployee.departmentId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            jobTitle: true,
          },
          orderBy: { firstName: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const notifications: NavNotification[] = [];

  for (const leave of pendingLeaves) {
    notifications.push({
      id: `leave-${leave.id}`,
      type: "leave",
      title: "Leave approval needed",
      message: `${fullName(leave.employee.firstName, leave.employee.lastName)} requested ${leave.type.toLowerCase()} leave`,
      href: "/leave",
      createdAt: leave.createdAt.toISOString(),
    });
  }

  for (const leave of myLeaveUpdates) {
    notifications.push({
      id: `my-leave-${leave.id}`,
      type: "leave",
      title: `Leave ${leave.status.toLowerCase()}`,
      message: `Your ${leave.type.toLowerCase()} leave request was ${leave.status.toLowerCase()}`,
      href: "/leave",
      createdAt: leave.updatedAt.toISOString(),
    });
  }

  for (const record of recentPayroll) {
    notifications.push({
      id: `payroll-${record.id}`,
      type: "payroll",
      title: "Payslip available",
      message: `Payroll for ${new Date(record.periodStart).toLocaleDateString()} is ready to view`,
      href: "/payroll",
      createdAt: (record.paidAt ?? record.createdAt).toISOString(),
    });
  }

  for (const announcement of recentAnnouncements) {
    notifications.push({
      id: `announcement-${announcement.id}`,
      type: "announcement",
      title: announcement.title,
      message: announcement.content.slice(0, 120),
      href: "/announcements",
      createdAt: announcement.createdAt.toISOString(),
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const previewMembers =
    teamMembers.length > 0 ? teamMembers : departmentPeers;
  const teamOverflowCount = Math.max(previewMembers.length - 3, 0);

  return {
    notificationCount: notifications.length,
    notifications: notifications.slice(0, 12),
    teamMembers: previewMembers.slice(0, 3),
    teamOverflowCount,
    pendingLeaveCount: pendingLeaves.length,
    inviteHref: canInvite ? "/employees/new" : null,
    canInvite,
    messagesHref: "/help/contact",
  };
}
