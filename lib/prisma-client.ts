import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

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

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrismaClient(forceNew = false) {
  if (forceNew && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = undefined;
  }

  const cached = globalForPrisma.prisma;
  if (!forceNew && cached && isPrismaClientFresh(cached)) {
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
