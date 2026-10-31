import { isNotificationModelReady, isNotificationReadModelReady, prisma } from "@/lib/prisma";
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

  | "general"

  | "resignation"

  | "loan";
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
  resignation: "announcements",
  loan: "payroll",
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

/**
 * Notifications that are derived on the fly (pending leave, announcements,
 * attendance, appraisal reminders, …) are not rows in the Notification table.
 * They use stable `prefix-<recordId>` keys, whereas Prisma cuid ids do not
 * contain hyphens.
 */
const COMPUTED_NOTIFICATION_PREFIXES = [
  "leave-",
  "my-leave-",
  "payroll-",
  "announcement-",
  "attendance-",
  "performance-",
  "my-performance-",
  "checklist-",
  "resignation-",
  "my-resignation-",
  "loan-",
  "general-",
  "subscription-",
  "integration-",
];

export function isComputedNotificationId(id: string) {
  return COMPUTED_NOTIFICATION_PREFIXES.some((prefix) => id.startsWith(prefix));
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

/**
 * Read receipts for derived notifications. `keys` limits the query when the
 * caller already knows which notifications it is about to render.
 */
export async function getComputedNotificationReads(userId: string, keys?: string[]) {
  const reads = new Map<string, string>();
  if (!isNotificationReadModelReady()) return reads;

  const rows = await prisma.notificationRead.findMany({
    where: {
      userId,
      ...(keys && keys.length > 0 ? { key: { in: keys } } : {}),
    },
    select: { key: true, readAt: true },
  });

  for (const row of rows) {
    reads.set(row.key, row.readAt.toISOString());
  }
  return reads;
}

export async function markComputedNotificationRead(userId: string, key: string) {
  if (!isNotificationReadModelReady()) return false;

  await prisma.notificationRead.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key },
    update: { readAt: new Date() },
  });
  broadcastAppEvent("notification_updated", { userId, id: key });
  return true;
}

export async function markComputedNotificationsRead(userId: string, keys: string[]) {
  if (!isNotificationReadModelReady() || keys.length === 0) return;

  const unique = [...new Set(keys)];
  await prisma.notificationRead.createMany({
    data: unique.map((key) => ({ userId, key })),
    skipDuplicates: true,
  });
  broadcastAppEvent("notification_updated", { userId, all: true });
}

export async function markAllNotificationsRead(userId: string, computedKeys: string[] = []) {
  if (isNotificationModelReady()) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  if (computedKeys.length > 0) {
    await markComputedNotificationsRead(userId, computedKeys);
  }
  broadcastAppEvent("notification_updated", { userId, all: true });
}

export function notificationToNavItem(n: {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: Date;
  readAt?: Date | null;
}) {
  return {
    id: n.id,
    type: n.type as CreateNotificationInput["type"],
    title: n.title,
    message: n.message,
    href: n.href,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  };
}

export function isNotificationDbEnabled() {
  return isNotificationModelReady();
}
