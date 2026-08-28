import { NextRequest, NextResponse } from "next/server";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import { listIntegrations, isConnected } from "@/lib/integrations/store";
import { providerToSlug } from "@/lib/integrations/providers";
import { isGoogleWorkspaceConfigured, getGoogleRedirectUri } from "@/lib/integrations/google/workspace";
import { isZohoConfigured } from "@/lib/integrations/zoho/oauth";
import { getZohoRedirectUri } from "@/lib/integrations/oauth-env";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

function isProviderConfigured(provider: IntegrationProvider) {
  if (provider === "GOOGLE_WORKSPACE") return isGoogleWorkspaceConfigured();
  return isZohoConfigured();
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const ctx = { request };

  const companyId = session.companyId ?? null;
  const integrations = await listIntegrations(companyId);
  const byProvider = new Map(integrations.map((row) => [row.provider, row]));

  const items = INTEGRATION_CATALOG.map((item) => {
    const row = byProvider.get(item.provider);
    return {
      provider: item.provider,
      slug: providerToSlug(item.provider),
      name: item.name,
      vendor: item.vendor,
      description: item.description,
      modules: item.modules,
      webhookPath: item.webhookPath,
      docsUrl: item.docsUrl,
      configured: isProviderConfigured(item.provider),
      status: row?.status ?? "DISCONNECTED",
      connected: isConnected(row ?? null),
      accountEmail: row?.accountEmail ?? null,
      lastSyncAt: row?.lastSyncAt ?? null,
      lastError: row?.lastError ?? null,
      connectedAt: row?.connectedAt ?? null,
      webhookSecret: row?.webhookSecret ?? null,
    };
  });

  const recentLogs = await prisma.integrationSyncLog.findMany({
    where: {
      integration: { companyId },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      integration: { select: { provider: true } },
    },
  });

  return NextResponse.json({
    googleRedirectUri: getGoogleRedirectUri(ctx),
    zohoRedirectUri: getZohoRedirectUri(undefined, ctx),
    items,
    logs: recentLogs.map((log) => ({
      id: log.id,
      provider: log.integration.provider,
      direction: log.direction,
      eventType: log.eventType,
      summary: log.summary,
      status: log.status,
      createdAt: log.createdAt,
    })),
  });
}
