import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma-client";

const CONNECTION_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

function isConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("connection") ||
    msg.includes("econnreset") ||
    msg.includes("forcibly closed") ||
    msg.includes("server closed") ||
    msg.includes("timeout") ||
    msg.includes("broken pipe")
  );
}

export async function reconnectPrisma() {
  const client = getPrismaClient();
  try {
    await client.$disconnect();
  } catch {
    // Ignore stale disconnect errors.
  }
  getPrismaClient(true);
}

/** Run a DB operation once, reconnect and retry on dropped connections (Neon pooler). */
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt >= retries) throw error;
      await reconnectPrisma();
    }
  }
  throw lastError;
}
