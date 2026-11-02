import type { IntegrationRecord } from "@/lib/integrations/types";
import { getCatalogItem } from "@/lib/integrations/catalog";
import { upsertIntegration } from "@/lib/integrations/store";

const provider = "QUICKBOOKS" as const;
const callback = (origin: string) => `${origin.replace(/\/$/, "")}/api/integrations/quickbooks/callback`;
const apiHost = () => process.env.INTUIT_ENVIRONMENT === "sandbox" ? "https://sandbox-quickbooks.api.intuit.com" : "https://quickbooks.api.intuit.com";

export function isQuickBooksConfigured() {
  return Boolean(process.env.INTUIT_CLIENT_ID && process.env.INTUIT_CLIENT_SECRET && process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN);
}

export function getQuickBooksAuthUrl(state: string, origin: string) {
  if (!isQuickBooksConfigured()) return null;
  const url = new URL("https://appcenter.intuit.com/connect/oauth2");
  url.search = new URLSearchParams({
    client_id: process.env.INTUIT_CLIENT_ID!,
    response_type: "code",
    scope: (getCatalogItem(provider)?.scopes ?? []).join(" "),
    redirect_uri: callback(origin),
    state,
  }).toString();
  return url.toString();
}

async function tokenRequest(params: URLSearchParams) {
  const credentials = Buffer.from(`${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params,
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error_description || payload.error || "QuickBooks OAuth failed"));
  return payload;
}

export async function exchangeQuickBooksCode(code: string, realmId: string, companyId: string | null, origin: string) {
  if (!isQuickBooksConfigured()) throw new Error("QuickBooks OAuth is not configured");
  const tokens = await tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback(origin) }));
  const accessToken = String(tokens.access_token || "");
  if (!accessToken || !realmId) throw new Error("QuickBooks did not return a company connection");
  const response = await fetch(`${apiHost()}/v3/company/${encodeURIComponent(realmId)}/companyinfo/${encodeURIComponent(realmId)}?minorversion=75`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("QuickBooks company connection could not be verified");
  const info = (result.CompanyInfo || {}) as Record<string, unknown>;
  return upsertIntegration(provider, companyId, {
    status: "CONNECTED", accessToken, refreshToken: String(tokens.refresh_token || "") || null,
    expiryDate: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
    accountEmail: String(info.CompanyName || "QuickBooks company") || null,
    accountId: realmId,
    scopes: JSON.stringify(getCatalogItem(provider)?.scopes ?? []),
    metadata: JSON.stringify({ realmId, environment: process.env.INTUIT_ENVIRONMENT === "sandbox" ? "sandbox" : "production" }),
    connectedAt: new Date(), lastError: null,
  });
}

export async function syncQuickBooks(integration: IntegrationRecord) {
  if (!integration.accountId || (!integration.accessToken && !integration.refreshToken)) throw new Error("QuickBooks company connection is incomplete");
  let current = integration;
  if (!current.expiryDate || current.expiryDate.getTime() < Date.now() + 60_000) {
    if (!current.refreshToken) throw new Error("QuickBooks access expired. Reconnect the company.");
    const tokens = await tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: current.refreshToken }));
    current = await upsertIntegration(provider, current.companyId, {
      accessToken: String(tokens.access_token || current.accessToken || ""),
      refreshToken: String(tokens.refresh_token || current.refreshToken),
      expiryDate: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
    });
  }
  const host = apiHost();
  const response = await fetch(`${host}/v3/company/${encodeURIComponent(current.accountId!)}/companyinfo/${encodeURIComponent(current.accountId!)}?minorversion=75`, {
    headers: { Authorization: `Bearer ${current.accessToken}`, Accept: "application/json" },
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("QuickBooks connection expired. Reconnect it and try again.");
  const info = (payload.CompanyInfo || {}) as Record<string, unknown>;
  return { synced: 1, summary: `QuickBooks Online: verified access to ${String(info.CompanyName || "connected company")}` };
}
