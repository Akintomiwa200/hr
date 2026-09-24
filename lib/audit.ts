import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const auditModules = [
  "dashboard",
  "employees",
  "departments",
  "teams",
  "attendance",
  "leave",
  "payroll",
  "loans",
  "performance",
  "recruitment",
  "checklist",
  "letters",
  "announcements",
  "holidays",
  "documents",
  "notes",
  "notifications",
  "integrations",
  "subscription",
  "offboarding",
  "reports",
  "bulk-messaging",
] as const;

export type AuditModule = (typeof auditModules)[number];

export const auditActions = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "SETTING",
  "RUN",
  "IMPORT",
  "SYNC",
  "OFFBOARD",
] as const;

export type AuditAction = (typeof auditActions)[number];

export type AuditActor = Pick<
  SessionUser,
  "id" | "email" | "firstName" | "lastName" | "role" | "companyId"
>;

export type AuditEntry = {
  actor: AuditActor;
  module: string;
  action: string;
  entityId?: string;
  entityLabel?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
};

export function actorDisplayName(actor: AuditActor): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
  return name || actor.email || actor.id;
}

/** Fire-and-forget write; never throws into the calling route. */
export function audit(entry: AuditEntry) {
  const meta = entry.meta as Prisma.InputJsonObject | undefined;
  return prisma.auditLog
    .create({
      data: {
        companyId: entry.actor.companyId ?? null,
        actorUserId: entry.actor.id,
        actorName: actorDisplayName(entry.actor),
        actorRole: entry.actor.role,
        action: entry.action,
        module: entry.module,
        entityId: entry.entityId ?? null,
        entityLabel: entry.entityLabel ?? null,
        meta: meta ?? undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    })
    .catch(() => null);
}

export type AuditFilter = {
  companyId?: string | null;
  module?: string;
  action?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

function buildAuditWhere(filter: AuditFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filter.companyId) where.companyId = filter.companyId;
  if (filter.module) where.module = filter.module;
  if (filter.action) where.action = filter.action;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    where.OR = [
      { actorName: { contains: q, mode: "insensitive" } },
      { entityLabel: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { module: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.from || filter.to) {
    where.createdAt = {};
    if (filter.from) where.createdAt.gte = filter.from;
    if (filter.to) where.createdAt.lte = filter.to;
  }
  return where;
}

export async function listAuditLogs(filter: AuditFilter) {
  const take = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  return prisma.auditLog.findMany({
    where: buildAuditWhere(filter),
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function countAuditLogs(filter: AuditFilter) {
  return prisma.auditLog.count({ where: buildAuditWhere(filter) });
}

export type AuditSummary = {
  total: number;
  last24h: number;
  uniqueActors: number;
  byModule: { module: string; count: number }[];
  byAction: { action: string; count: number }[];
};

export async function auditSummary(filter: AuditFilter): Promise<AuditSummary> {
  const where = buildAuditWhere(filter);
  const [total, last24h, uniqueActors, byModule, byAction] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.auditLog.findMany({ where, select: { actorUserId: true }, distinct: ["actorUserId"] }),
    prisma.auditLog.groupBy({ by: ["module"], where, _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["action"], where, _count: { _all: true } }),
  ]);

  return {
    total,
    last24h,
    uniqueActors: uniqueActors.filter((r) => r.actorUserId).length,
    byModule: byModule
      .sort((a, b) => b._count._all - a._count._all)
      .map((r) => ({ module: r.module, count: r._count._all })),
    byAction: byAction
      .sort((a, b) => b._count._all - a._count._all)
      .map((r) => ({ action: r.action, count: r._count._all })),
  };
}