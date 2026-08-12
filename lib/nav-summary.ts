import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import {
  canApproveLeave,
  canManageEmployees,
  canViewTeamScope,
  normalizeRole,
} from "@/lib/roles";
import { fullName } from "@/lib/utils";
import type { NavNotification, NavSummary, NavTeamMember } from "@/lib/nav-summary-types";
import {
  getCompanyScope,
  employeeCompanyWhere,
  announcementCompanyWhere,
} from "@/lib/company-scope";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  isNotificationEnabled,
  notificationToNavItem,
  parseUserPreferences,
} from "@/lib/notifications";

export type { NavNotification, NavSummary, NavTeamMember } from "@/lib/nav-summary-types";

const RECENT_DAYS = 14;

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isComputedId(id: string) {
  return id.includes("-") && !id.startsWith("cl");
}

export async function getNavSummary(session: SessionUser): Promise<NavSummary> {
  const role = normalizeRole(session.role);
  const scope = getCompanyScope(session);
  const orgEmployee = employeeCompanyWhere(scope);
  const since = daysAgo(RECENT_DAYS);
  const today = startOfDay();
  const canInvite = canManageEmployees(role);
  const isApprover = canApproveLeave(role);
  const teamScope = canViewTeamScope(role) && session.employeeId;

  const userPrefs = await prisma.user.findUnique({
    where: { id: session.id },
    select: { preferences: true },
  });
  const preferences = parseUserPreferences(userPrefs?.preferences);

  const currentEmployee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { departmentId: true },
      })
    : null;

  const teamWhere =
    session.employeeId && (role === "MANAGER" || role === "SUPERVISOR")
      ? { managerId: session.employeeId, status: "ACTIVE" as const, ...orgEmployee }
      : null;

  const [
    dbNotifications,
    unreadDbCount,
    recentAnnouncements,
    pendingLeaves,
    myLeaveUpdates,
    recentPayroll,
    teamMembers,
    departmentPeers,
    teamAbsentToday,
    teamLateToday,
    pendingManagerAppraisals,
    myAppraisalUpdates,
  ] = await Promise.all([
    getUserNotifications(session.id, 30),
    getUnreadNotificationCount(session.id),
    prisma.announcement.findMany({
      where: { createdAt: { gte: since }, ...announcementCompanyWhere(scope) },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    isApprover
      ? prisma.leaveRequest.findMany({
          where: {
            status: "PENDING",
            employee: {
              ...orgEmployee,
              ...(session.employeeId &&
              (role === "MANAGER" || role === "SUPERVISOR")
                ? { managerId: session.employeeId }
                : {}),
            },
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
          where: { managerId: session.employeeId, status: "ACTIVE", ...orgEmployee },
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
            ...orgEmployee,
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
    teamWhere
      ? prisma.attendance.findMany({
          where: {
            date: { gte: today },
            status: "ABSENT",
            employee: teamWhere,
          },
          include: { employee: true },
          take: 5,
        })
      : Promise.resolve([]),
    teamWhere
      ? prisma.attendance.findMany({
          where: {
            date: { gte: today },
            status: "LATE",
            employee: teamWhere,
          },
          include: { employee: true },
          take: 5,
        })
      : Promise.resolve([]),
    teamScope && session.employeeId
      ? prisma.performanceAppraisal.findMany({
          where: {
            status: "MANAGER_REVIEW",
            managerId: session.employeeId,
            employee: orgEmployee,
          },
          include: { employee: true, cycle: true },
          orderBy: { selfSubmittedAt: "desc" },
          take: 6,
        })
      : role === "HR" || role === "COMPANY_ADMIN"
        ? prisma.performanceAppraisal.findMany({
            where: { status: "MANAGER_REVIEW", employee: orgEmployee },
            include: { employee: true, cycle: true },
            orderBy: { selfSubmittedAt: "desc" },
            take: 6,
          })
        : Promise.resolve([]),
    session.employeeId
      ? prisma.performanceAppraisal.findMany({
          where: {
            employeeId: session.employeeId,
            updatedAt: { gte: since },
            status: { in: ["MANAGER_REVIEW", "COMPLETED"] },
          },
          include: { cycle: true },
          orderBy: { updatedAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  const notifications: NavNotification[] = dbNotifications.map((n) => ({
    ...notificationToNavItem(n),
    readAt: n.readAt?.toISOString() ?? null,
    persistent: true,
  }));

  const addComputed = (item: NavNotification) => {
    if (!isNotificationEnabled(preferences, item.type)) return;
    if (notifications.some((n) => n.id === item.id)) return;
    notifications.push(item);
  };

  for (const leave of pendingLeaves) {
    addComputed({
      id: `leave-${leave.id}`,
      type: "leave",
      title: "Leave approval needed",
      message: `${fullName(leave.employee.firstName, leave.employee.lastName)} requested ${leave.type.toLowerCase()} leave`,
      href: "/leave",
      createdAt: leave.createdAt.toISOString(),
    });
  }

  for (const leave of myLeaveUpdates) {
    addComputed({
      id: `my-leave-${leave.id}`,
      type: "leave",
      title: `Leave ${leave.status.toLowerCase()}`,
      message: `Your ${leave.type.toLowerCase()} leave request was ${leave.status.toLowerCase()}`,
      href: "/leave",
      createdAt: leave.updatedAt.toISOString(),
    });
  }

  for (const record of recentPayroll) {
    addComputed({
      id: `payroll-${record.id}`,
      type: "payroll",
      title: "Payslip available",
      message: `Payroll for ${new Date(record.periodStart).toLocaleDateString()} is ready to view`,
      href: "/payroll",
      createdAt: (record.paidAt ?? record.createdAt).toISOString(),
    });
  }

  for (const announcement of recentAnnouncements) {
    addComputed({
      id: `announcement-${announcement.id}`,
      type: "announcement",
      title: announcement.title,
      message: announcement.content.slice(0, 120),
      href: "/announcements",
      createdAt: announcement.createdAt.toISOString(),
    });
  }

  for (const row of teamAbsentToday) {
    addComputed({
      id: `attendance-absent-${row.id}`,
      type: "attendance",
      title: "Absent today",
      message: `${fullName(row.employee.firstName, row.employee.lastName)} is marked absent`,
      href: "/attendance",
      createdAt: row.date.toISOString(),
    });
  }

  for (const row of teamLateToday) {
    addComputed({
      id: `attendance-late-${row.id}`,
      type: "attendance",
      title: "Late arrival",
      message: `${fullName(row.employee.firstName, row.employee.lastName)} checked in late`,
      href: "/attendance",
      createdAt: row.date.toISOString(),
    });
  }

  for (const appraisal of pendingManagerAppraisals) {
    addComputed({
      id: `performance-${appraisal.id}`,
      type: "performance",
      title: "Review pending",
      message: `${fullName(appraisal.employee.firstName, appraisal.employee.lastName)} — ${appraisal.cycle.name} awaits manager review`,
      href: `/performance/appraisals/${appraisal.id}`,
      createdAt: (appraisal.selfSubmittedAt ?? appraisal.updatedAt).toISOString(),
    });
  }

  for (const appraisal of myAppraisalUpdates) {
    if (appraisal.status === "COMPLETED") {
      addComputed({
        id: `my-performance-done-${appraisal.id}`,
        type: "performance",
        title: "Review completed",
        message: `Your ${appraisal.cycle.name} review is complete${appraisal.overallRating ? ` — ${appraisal.overallRating}/5` : ""}`,
        href: `/performance/appraisals/${appraisal.id}`,
        createdAt: (appraisal.completedAt ?? appraisal.updatedAt).toISOString(),
      });
    } else if (appraisal.status === "MANAGER_REVIEW" && appraisal.selfSubmittedAt) {
      addComputed({
        id: `my-performance-wait-${appraisal.id}`,
        type: "performance",
        title: "Self-appraisal submitted",
        message: `${appraisal.cycle.name} is with your manager for review`,
        href: `/performance/appraisals/${appraisal.id}`,
        createdAt: appraisal.selfSubmittedAt.toISOString(),
      });
    }
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadComputed = notifications.filter(
    (n) => !n.persistent && !n.readAt
  ).length;
  const notificationCount = unreadDbCount + unreadComputed;

  const previewMembers =
    teamMembers.length > 0 ? teamMembers : departmentPeers;
  const teamOverflowCount = Math.max(previewMembers.length - 3, 0);

  return {
    notificationCount,
    notifications: notifications.slice(0, 12),
    teamMembers: previewMembers.slice(0, 3),
    teamOverflowCount,
    pendingLeaveCount: pendingLeaves.length,
    inviteHref: canInvite ? "/checklist/onboarding" : null,
    canInvite,
    messagesHref: "/help/contact",
  };
}
