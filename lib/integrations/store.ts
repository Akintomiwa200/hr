import type { IntegrationProvider, IntegrationStatus, IntegrationRecord } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export function generateWebhookSecret() {
  return randomBytes(24).toString("hex");
}

export async function getIntegration(
  provider: IntegrationProvider,
  companyId?: string | null
) {
  return prisma.integration.findFirst({
    where: { companyId: companyId ?? null, provider },
  });
}

export async function listIntegrations(companyId?: string | null) {
  return prisma.integration.findMany({
    where: { companyId: companyId ?? null },
    orderBy: { provider: "asc" },
  });
}

export async function upsertIntegration(
  provider: IntegrationProvider,
  companyId: string | null | undefined,
  data: Partial<
    Pick<
      IntegrationRecord,
      | "status"
      | "accessToken"
      | "refreshToken"
      | "expiryDate"
      | "accountEmail"
      | "accountId"
      | "scopes"
      | "metadata"
      | "webhookSecret"
      | "lastSyncAt"
      | "lastError"
      | "connectedAt"
    >
  >
) {
  const resolvedCompanyId = companyId ?? null;
  const existing = await getIntegration(provider, resolvedCompanyId);
  const webhookSecret = existing?.webhookSecret ?? generateWebhookSecret();

  if (existing) {
    return prisma.integration.update({
      where: { id: existing.id },
      data: { webhookSecret, ...data },
    });
  }

  return prisma.integration.create({
    data: {
      companyId: resolvedCompanyId,
      provider,
      webhookSecret,
      ...data,
    },
  });
}

export async function disconnectIntegration(
  provider: IntegrationProvider,
  companyId?: string | null
) {
  return upsertIntegration(provider, companyId, {
    status: "DISCONNECTED",
    accessToken: null,
    refreshToken: null,
    expiryDate: null,
    accountEmail: null,
    accountId: null,
    scopes: null,
    lastError: null,
    connectedAt: null,
  });
}

export async function logSyncEvent(
  integrationId: string,
  input: {
    direction: "inbound" | "outbound";
    eventType: string;
    summary?: string;
    payload?: unknown;
    status?: "success" | "error";
  }
) {
  return prisma.integrationSyncLog.create({
    data: {
      integrationId,
      direction: input.direction,
      eventType: input.eventType,
      summary: input.summary,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      status: input.status ?? "success",
    },
  });
}

export function parseMetadata(integration: IntegrationRecord | null): Record<string, unknown> {
  if (!integration?.metadata) return {};
  try {
    return JSON.parse(integration.metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function isConnected(integration: IntegrationRecord | null) {
  if (!integration) return false;
  if (integration.status === "DISCONNECTED") return false;
  return Boolean(integration.refreshToken || integration.accessToken);
}

export async function markSyncing(integrationId: string) {
  return prisma.integration.update({
    where: { id: integrationId },
    data: { status: "SYNCING" as IntegrationStatus },
  });
}

export async function markSynced(integrationId: string) {
  return prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: "CONNECTED" as IntegrationStatus,
      lastSyncAt: new Date(),
      lastError: null,
    },
  });
}

export async function markError(integrationId: string, message: string) {
  return prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: "ERROR" as IntegrationStatus,
      lastError: message.slice(0, 500),
    },
  });
}
