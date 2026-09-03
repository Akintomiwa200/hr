import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma-client";

export { getPrismaClient } from "@/lib/prisma-client";
export { reconnectPrisma, withPrismaRetry } from "@/lib/prisma-retry";

/** Always resolves through getPrismaClient() so hot-reload picks up new models. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, client);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

function hasDelegate(client: PrismaClient, key: string, method: "findMany" | "count" | "create") {
  const delegate = (client as unknown as Record<string, { findMany?: unknown; count?: unknown; create?: unknown } | undefined>)[key];
  return typeof delegate?.[method] === "function";
}

export function isNotificationModelReady() {
  return hasDelegate(getPrismaClient(), "notification", "findMany");
}

export function isRecruitmentModelsReady() {
  const client = getPrismaClient();
  return (
    hasDelegate(client, "recruitmentStage", "count") &&
    hasDelegate(client, "recruitmentTag", "count") &&
    hasDelegate(client, "recruitmentSource", "count") &&
    hasDelegate(client, "recruitmentEmailTemplate", "count")
  );
}

export function isApplicationActivityReady() {
  return hasDelegate(getPrismaClient(), "applicationActivity", "create");
}

export function isDocumentFolderModelReady() {
  return hasDelegate(getPrismaClient(), "documentFolder", "findMany");
}

export function isChecklistModelsReady() {
  const client = getPrismaClient();
  return (
    hasDelegate(client, "checklistTemplate", "findMany") &&
    hasDelegate(client, "checklistInstance", "findMany") &&
    hasDelegate(client, "checklistTask", "findMany") &&
    hasDelegate(client, "checklistTaskComment", "create")
  );
}

export function isChecklistTaskFileReady() {
  return hasDelegate(getPrismaClient(), "checklistTaskFile", "findMany");
}

export function isPortalTemplateModelReady() {
  const client = getPrismaClient();
  return (
    hasDelegate(client, "portalTemplate", "findMany") &&
    hasDelegate(client, "portalDocument", "findMany")
  );
}

export function isBranchModelsReady() {
  return hasDelegate(getPrismaClient(), "branch", "findMany");
}

export function isNoteModelReady() {
  return hasDelegate(getPrismaClient(), "note", "findMany");
}
