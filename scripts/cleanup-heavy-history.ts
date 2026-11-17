/**
 * Free database space by deleting old, low-value history.
 *
 * What it removes (all older than the configured retention window):
 *   - ChatMessage        (default 90 days, reactions/polls cascade)
 *   - ChatStatus         (default 7 days)
 *   - Notification       (default 90 days)
 *   - NotificationRead   (default 90 days)
 *   - AuditLog           (default 180 days)
 *
 * It never touches users, employees, payroll, leave, attendance, documents or
 * conversations themselves — only message/notification history.
 *
 * Safe by default: without `--confirm` it only reports what would be deleted.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/cleanup-heavy-history.ts
 *   npx tsx --env-file=.env scripts/cleanup-heavy-history.ts --confirm
 *   npx tsx --env-file=.env scripts/cleanup-heavy-history.ts --confirm --vacuum
 *
 * Options:
 *   --chat-days=90           retention for chat messages
 *   --status-days=7          retention for expired status notes
 *   --notification-days=90   retention for notifications
 *   --audit-days=180         retention for audit logs
 *   --confirm                actually delete (otherwise dry run)
 *   --vacuum                 VACUUM FULL affected tables afterwards so the
 *                            space is returned to the database, not just
 *                            marked reusable. Locks those tables briefly.
 */
import { getPrismaClient, prisma } from "../lib/prisma";

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const VACUUM = args.includes("--vacuum");

function argDays(name: string, fallback: number) {
  const raw = args.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const value = Number.parseInt(raw.split("=")[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const CHAT_DAYS = argDays("chat-days", 90);
const STATUS_DAYS = argDays("status-days", 7);
const NOTIFICATION_DAYS = argDays("notification-days", 90);
const AUDIT_DAYS = argDays("audit-days", 180);

function cutoff(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const chatBefore = cutoff(CHAT_DAYS);
  const statusBefore = cutoff(STATUS_DAYS);
  const notificationBefore = cutoff(NOTIFICATION_DAYS);
  const auditBefore = cutoff(AUDIT_DAYS);

  const [messages, statuses, notifications, notificationReads, auditLogs] =
    await Promise.all([
      prisma.chatMessage.count({ where: { createdAt: { lt: chatBefore } } }),
      prisma.chatStatus.count({ where: { createdAt: { lt: statusBefore } } }),
      prisma.notification.count({
        where: { createdAt: { lt: notificationBefore } },
      }),
      prisma.notificationRead.count({
        where: { readAt: { lt: notificationBefore } },
      }),
      prisma.auditLog.count({ where: { createdAt: { lt: auditBefore } } }),
    ]);

  console.log(`Retention: chat ${CHAT_DAYS}d, status ${STATUS_DAYS}d, notifications ${NOTIFICATION_DAYS}d, audit ${AUDIT_DAYS}d`);
  console.log(`ChatMessage        older than cutoff: ${messages}`);
  console.log(`ChatStatus         older than cutoff: ${statuses}`);
  console.log(`Notification       older than cutoff: ${notifications}`);
  console.log(`NotificationRead   older than cutoff: ${notificationReads}`);
  console.log(`AuditLog           older than cutoff: ${auditLogs}`);

  if (!CONFIRM) {
    console.log("\nDry run — nothing deleted. Re-run with --confirm to delete.");
    return;
  }

  const deletedMessages = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: chatBefore } },
  });
  const deletedStatuses = await prisma.chatStatus.deleteMany({
    where: { createdAt: { lt: statusBefore } },
  });
  const deletedNotifications = await prisma.notification.deleteMany({
    where: { createdAt: { lt: notificationBefore } },
  });
  const deletedNotificationReads = await prisma.notificationRead.deleteMany({
    where: { readAt: { lt: notificationBefore } },
  });
  const deletedAuditLogs = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: auditBefore } },
  });

  console.log("\nDeleted:");
  console.log(`  ChatMessage:      ${deletedMessages.count}`);
  console.log(`  ChatStatus:       ${deletedStatuses.count}`);
  console.log(`  Notification:     ${deletedNotifications.count}`);
  console.log(`  NotificationRead: ${deletedNotificationReads.count}`);
  console.log(`  AuditLog:         ${deletedAuditLogs.count}`);

  if (VACUUM) {
    const tables = [
      "ChatMessage",
      "ChatStatus",
      "Notification",
      "NotificationRead",
      "AuditLog",
    ];
    console.log("\nRunning VACUUM FULL (this can take a while)...");
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`VACUUM (FULL, ANALYZE) "${table}"`);
        console.log(`  ${table}: reclaimed`);
      } catch (error) {
        console.warn(
          `  ${table}: VACUUM failed — ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } else {
    console.log(
      "\nRows deleted. Run again with --vacuum to return the space to the database."
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
