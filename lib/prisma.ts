import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

type PrismaLike = Record<string, { findMany?: unknown; count?: unknown; create?: unknown } | undefined>;

function hasDelegate(client: PrismaClient, key: string, method: "findMany" | "count" | "create") {
  const delegate = (client as unknown as PrismaLike)[key];
  return typeof delegate?.[method] === "function";
}

/** Dev hot-reload can cache an old client missing newly generated models. */
function isPrismaClientFresh(client: PrismaClient) {
  return (
    hasDelegate(client, "notification", "findMany") &&
    hasDelegate(client, "recruitmentStage", "count") &&
    hasDelegate(client, "recruitmentTag", "count") &&
    hasDelegate(client, "recruitmentSource", "count") &&
    hasDelegate(client, "recruitmentEmailTemplate", "count") &&
    hasDelegate(client, "applicationActivity", "create") &&
    hasDelegate(client, "applicationEvaluation", "create") &&
    hasDelegate(client, "documentFolder", "findMany") &&
    hasDelegate(client, "checklistTemplate", "findMany") &&
    hasDelegate(client, "checklistInstance", "findMany") &&
    hasDelegate(client, "checklistTask", "findMany") &&
    hasDelegate(client, "checklistTaskComment", "create") &&
    hasDelegate(client, "branch", "findMany")
  );
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientFresh(cached)) {
    return cached;
  }

  if (cached && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/** Always resolves through getPrismaClient() so hot-reload picks up new models. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, client);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

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
