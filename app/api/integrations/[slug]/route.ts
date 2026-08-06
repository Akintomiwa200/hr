import { NextResponse } from "next/server";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { slugToProvider } from "@/lib/integrations/providers";
import { disconnectIntegration, getIntegration, isConnected } from "@/lib/integrations/store";
import { disconnectGoogleWorkspace } from "@/lib/integrations/google/workspace";
import { isGoogleWorkspaceConfigured } from "@/lib/integrations/google/workspace";
import { isZohoConfigured } from "@/lib/integrations/zoho/oauth";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const integration = await getIntegration(provider, session.companyId ?? null);
  const configured =
    provider === "GOOGLE_WORKSPACE"
      ? isGoogleWorkspaceConfigured()
      : isZohoConfigured();

  return NextResponse.json({
    provider,
    slug,
    configured,
    status: integration?.status ?? "DISCONNECTED",
    connected: isConnected(integration),
    accountEmail: integration?.accountEmail ?? null,
    lastSyncAt: integration?.lastSyncAt ?? null,
    lastError: integration?.lastError ?? null,
    connectedAt: integration?.connectedAt ?? null,
    webhookSecret: integration?.webhookSecret ?? null,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const companyId = session.companyId ?? null;
  if (provider === "GOOGLE_WORKSPACE") {
    await disconnectGoogleWorkspace(companyId);
  } else {
    await disconnectIntegration(provider, companyId);
  }

  broadcastAppEvent("integration_updated", { provider, action: "disconnected" });

  return NextResponse.json({ success: true });
}
