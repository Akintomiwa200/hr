import { isNotificationModelReady, prisma } from "@/lib/prisma";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export type NotificationType =
  | "leave"
  | "announcement"
  | "payroll"
  | "attendance"
  | "performance"
  | "subscription"
| "integration"

  | "checklist"

  | "general";
export type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
};

const PREFERENCE_KEY: Record<NotificationType, string> = {
  leave: "leave",
  announcement: "announcements",
  payroll: "payroll",
  attendance: "announcements",
  performance: "performance",
subscription: "announcements",
  integration: "announcements",
  checklist: "checklist",
  general: "announcements",
};

export function parseUserPreferences(raw: string | null | undefined): Record<string, boolean> {
  if (!raw) {
    return { leave: true, payroll: true, announcements: true, performance: true };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return {
      leave: parsed.leave ?? true,
      payroll: parsed.payroll ?? true,
      announcements: parsed.announcements ?? true,
      performance: parsed.performance ?? true,
    };
  } catch {
    return { leave: true, payroll: true, announcements: true, performance: true };
  }
}

export function isNotificationEnabled(
  preferences: Record<string, boolean>,
  type: NotificationType
): boolean {
  const key = PREFERENCE_KEY[type];
  return preferences[key] ?? true;
}

export async function createNotification(input: CreateNotificationInput) {
  if (!isNotificationModelReady()) return null;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { preferences: true },
  });
  if (!user) return null;

  const prefs = parseUserPreferences(user.preferences);
  if (!isNotificationEnabled(prefs, input.type)) return null;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
    },
  });

  broadcastAppEvent("notification_updated", { userId: input.userId, id: notification.id });
  return notification;
}

export async function notifyCompanyUsers(
  companyId: string,
  input: Omit<CreateNotificationInput, "userId">,
  options?: { roles?: string[] }
) {
  if (!isNotificationModelReady()) return [];

  const users = await prisma.user.findMany({
    where: {
      companyId,
      ...(options?.roles?.length ? { role: { in: options.roles as never[] } } : {}),
    },
    select: { id: true, preferences: true },
  });

  const created = [];
  for (const user of users) {
    const prefs = parseUserPreferences(user.preferences);
    if (!isNotificationEnabled(prefs, input.type)) continue;
    const n = await prisma.notification.create({
      data: {
        userId: user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
      },
    });
    created.push(n);
  }

  if (created.length > 0) {
    broadcastAppEvent("notification_updated", { companyId, count: created.length });
  }
  return created;
}

export async function getUserNotifications(userId: string, limit = 20): Promise<NotificationRecord[]> {
  if (!isNotificationModelReady()) return [];

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  if (!isNotificationModelReady()) return 0;

  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: string, id: string) {
  if (!isNotificationModelReady()) return false;

  const updated = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  if (updated.count > 0) {
    broadcastAppEvent("notification_updated", { userId, id });
  }
  return updated.count > 0;
}

export async function markAllNotificationsRead(userId: string) {
  if (!isNotificationModelReady()) return;

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  broadcastAppEvent("notification_updated", { userId, all: true });
}

export function notificationToNavItem(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type as CreateNotificationInput["type"],
    title: n.title,
    message: n.message,
    href: n.href,
    createdAt: n.createdAt.toISOString(),
  };
}

export function isNotificationDbEnabled() {
  return isNotificationModelReady();
}
