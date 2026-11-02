import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles, unauthorized } from "@/lib/api-auth";
import { slugToProvider, encodeOAuthState } from "@/lib/integrations/providers";
import { getGoogleAuthUrl } from "@/lib/integrations/google/workspace";
import { getZohoAuthUrl } from "@/lib/integrations/zoho/oauth";
import { getMicrosoft365AuthUrl, isMicrosoft365Configured } from "@/lib/integrations/microsoft";
import { getQuickBooksAuthUrl, isQuickBooksConfigured } from "@/lib/integrations/quickbooks";
import { getOAuthAppOrigin } from "@/lib/integrations/oauth-env";
import { resolveAppUrl } from "@/lib/app-url";
import { bambooHrFetch } from "@/lib/integrations/bamboohr";
import { INTEGRATION_ADMIN_ROLES } from "@/lib/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const provider = slugToProvider(slug);
  if (!provider) redirect("/settings/integrations?error=unknown");

  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();

  const state = encodeOAuthState({
    userId: session.id,
    companyId: session.companyId ?? null,
    provider,
  });

  const ctx = { request };
  const origin = getOAuthAppOrigin(ctx);
  const url = provider === "GOOGLE_WORKSPACE"
    ? getGoogleAuthUrl(state, ctx)
    : provider === "MICROSOFT_365"
      ? getMicrosoft365AuthUrl(state, origin)
      : provider === "QUICKBOOKS"
        ? getQuickBooksAuthUrl(state, origin)
        : provider === "BAMBOOHR"
          ? null
          : getZohoAuthUrl(provider, state, undefined, ctx);

  if (provider === "BAMBOOHR") redirect("/settings/integrations?setup=bamboohr");
  if (provider === "MICROSOFT_365" && !isMicrosoft365Configured()) redirect(`/settings/integrations?error=not-configured&provider=${slug}`);
  if (provider === "QUICKBOOKS" && !isQuickBooksConfigured()) redirect(`/settings/integrations?error=not-configured&provider=${slug}`);

  if (!url) redirect(`/settings/integrations?error=not-configured&provider=${slug}`);
  redirect(url);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "custom-webhook") {
    const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
    if (error || !session) return error ?? unauthorized();
    const input = await request.json().catch(() => null) as { name?: string; endpointUrl?: string; secret?: string } | null;
    const name = input?.name?.trim() ?? "";
    const secret = input?.secret?.trim() ?? "";
    let endpoint: URL;
    try { endpoint = new URL(input?.endpointUrl ?? ""); } catch { return Response.json({ error: "Enter a valid HTTPS endpoint." }, { status: 400 }); }
    const hostname = endpoint.hostname.toLowerCase();
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || !hostname.includes(".") || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".localhost") || hostname.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.)/.test(hostname) || secret.length < 24 || name.length < 2 || name.length > 80) {
      return Response.json({ error: "Use a public HTTPS endpoint, a name, and a signing secret of at least 24 characters." }, { status: 400 });
    }
    const { upsertIntegration } = await import("@/lib/integrations/store");
    const { runIntegrationSync } = await import("@/lib/integrations/sync");
    await upsertIntegration("CUSTOM_WEBHOOK", session.companyId ?? null, {
      status: "CONNECTED", accessToken: secret, refreshToken: null, accountEmail: name,
      metadata: JSON.stringify({ endpointName: name, endpointUrl: endpoint.toString() }),
      connectedAt: new Date(), lastError: null,
    });
    try {
      await runIntegrationSync("CUSTOM_WEBHOOK", session.companyId ?? null);
      return Response.json({ success: true });
    } catch (setupError) {
      const message = setupError instanceof Error ? setupError.message : "Webhook endpoint test failed";
      return Response.json({ error: message }, { status: 400 });
    }
  }
  if (slug !== "bamboohr") return Response.json({ error: "Unknown integration setup" }, { status: 404 });
  const { session, error } = await requireRoles(INTEGRATION_ADMIN_ROLES);
  if (error || !session) return error ?? unauthorized();
  const input = await request.json().catch(() => null) as { companyDomain?: string; apiKey?: string } | null;
  const companyDomain = input?.companyDomain?.trim().toLowerCase() ?? "";
  const apiKey = input?.apiKey?.trim() ?? "";
  if (!/^[a-z0-9-]{2,63}$/.test(companyDomain) || apiKey.length < 20 || apiKey.length > 200) {
    return Response.json({ error: "Enter a valid BambooHR company subdomain and API key." }, { status: 400 });
  }
  const { upsertIntegration, getIntegration, parseMetadata } = await import("@/lib/integrations/store");
  const { runIntegrationSync } = await import("@/lib/integrations/sync");
  const current = await getIntegration("BAMBOOHR", session.companyId ?? null);
  const oldMetadata = parseMetadata(current);
  const integration = await upsertIntegration("BAMBOOHR", session.companyId ?? null, {
    status: "CONNECTED", accessToken: apiKey, refreshToken: null,
    accountEmail: `${companyDomain}.bamboohr.com`,
    metadata: JSON.stringify({ ...oldMetadata, companyDomain }), connectedAt: new Date(), lastError: null,
  });
  try {
    if (!oldMetadata.webhookPrivateKey || oldMetadata.companyDomain !== companyDomain) {
      const companyScope = session.companyId ?? "platform";
      const webhookResponse = await fetch(`https://${companyDomain}.bamboohr.com/api/v1/webhooks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: "Smart HR employee sync",
          monitorFields: ["firstName", "lastName", "workEmail", "jobTitle", "workPhone"],
          postFields: { firstName: "firstName", lastName: "lastName", workEmail: "workEmail", jobTitle: "jobTitle", workPhone: "workPhone" },
          url: `${resolveAppUrl({ request })}/api/webhooks/bamboohr?companyId=${encodeURIComponent(companyScope)}`,
          format: "json",
          includeCompanyDomain: true,
        }),
      });
      const webhook = await webhookResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (webhookResponse.ok && typeof webhook.privateKey === "string") {
        await upsertIntegration("BAMBOOHR", session.companyId ?? null, {
          metadata: JSON.stringify({ ...oldMetadata, companyDomain, webhookId: webhook.id, webhookPrivateKey: webhook.privateKey }),
        });
      }
    }
  } catch {
    // Initial directory sync still works if this BambooHR API key cannot manage webhooks.
  }
  try {
    await bambooHrFetch(integration, "/meta/fields?fields=firstName,lastName,workEmail,jobTitle,workPhone");
    await runIntegrationSync("BAMBOOHR", session.companyId ?? null);
    return Response.json({ success: true });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Could not connect to BambooHR";
    return Response.json({ error: message }, { status: 400 });
  }
}
