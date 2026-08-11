import type { IntegrationRecord, IntegrationProvider } from "@/lib/integrations/types";
import { getAppUrl } from "@/lib/constants/auth";
import { getCatalogItem } from "@/lib/integrations/catalog";
import { upsertIntegration, getIntegration } from "@/lib/integrations/store";

const ZOHO_PROVIDER_MAP: Record<string, IntegrationProvider> = {
  people: "ZOHO_PEOPLE",
  recruit: "ZOHO_RECRUIT",
  books: "ZOHO_BOOKS",
  sign: "ZOHO_SIGN",
  mail: "ZOHO_MAIL",
};

export function zohoAccountsUrl() {
  return (
    process.env.ZOHO_ACCOUNTS_URL?.replace(/\/$/, "") || "https://accounts.zoho.com"
  );
}

export function zohoApiDomain() {
  return process.env.ZOHO_API_DOMAIN?.replace(/\/$/, "") || "https://www.zohoapis.com";
}

export function isZohoConfigured() {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}

export function getZohoProviderKey(provider: IntegrationProvider) {
  const entry = Object.entries(ZOHO_PROVIDER_MAP).find(([, p]) => p === provider);
  return entry?.[0] ?? "people";
}

export function getZohoAuthUrl(
  provider: IntegrationProvider,
  state: string,
  appUrl = getAppUrl()
) {
  if (!isZohoConfigured()) return null;
  const item = getCatalogItem(provider);
  if (!item) return null;

  const redirectUri = `${appUrl}/api/integrations/${provider.toLowerCase().replace(/_/g, "-")}/callback`;
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: item.scopes.join(","),
    redirect_uri: redirectUri,
    state,
  });

  return `${zohoAccountsUrl()}/oauth/v2/auth?${params.toString()}`;
}

export async function exchangeZohoCode(
  provider: IntegrationProvider,
  code: string,
  companyId?: string | null,
  appUrl = getAppUrl()
) {
  if (!isZohoConfigured()) throw new Error("Zoho OAuth is not configured");

  const redirectUri = `${appUrl}/api/integrations/${provider.toLowerCase().replace(/_/g, "-")}/callback`;
  const tokenUrl = `${zohoAccountsUrl()}/oauth/v2/token`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho token exchange failed: ${text}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
  };

  return upsertIntegration(provider, companyId, {
    status: "CONNECTED",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
    scopes: JSON.stringify(getCatalogItem(provider)?.scopes ?? []),
    metadata: JSON.stringify({
      apiDomain: tokens.api_domain ?? zohoApiDomain(),
    }),
    connectedAt: new Date(),
    lastError: null,
  });
}

export async function refreshZohoToken(integration: IntegrationRecord) {
  if (!integration.refreshToken) throw new Error("No refresh token");

  const tokenUrl = `${zohoAccountsUrl()}/oauth/v2/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    refresh_token: integration.refreshToken,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(await res.text());

  const tokens = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return upsertIntegration(integration.provider, integration.companyId, {
    accessToken: tokens.access_token,
    expiryDate: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : integration.expiryDate,
  });
}

export async function zohoApiFetch(
  integration: IntegrationRecord,
  path: string,
  init?: RequestInit
) {
  let current = integration;
  if (
    current.expiryDate &&
    current.expiryDate.getTime() < Date.now() + 60_000 &&
    current.refreshToken
  ) {
    current = await refreshZohoToken(current);
  }

  if (!current.accessToken) throw new Error("Zoho not connected");

  let meta: Record<string, unknown> = {};
  try {
    meta = current.metadata ? JSON.parse(current.metadata) : {};
  } catch {
    meta = {};
  }

  const base = (meta.apiDomain as string) || zohoApiDomain();
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${current.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Zoho API ${path}: ${await res.text()}`);
  }

  return res.json();
}

export async function shareZohoTokensFromSuite(
  source: IntegrationRecord,
  targetProvider: IntegrationProvider,
  companyId?: string | null
) {
  const existing = await getIntegration(targetProvider, companyId);
  if (existing?.refreshToken) return existing;

  return upsertIntegration(targetProvider, companyId, {
    status: "CONNECTED",
    accessToken: source.accessToken,
    refreshToken: source.refreshToken,
    expiryDate: source.expiryDate,
    accountEmail: source.accountEmail,
    accountId: source.accountId,
    scopes: JSON.stringify(getCatalogItem(targetProvider)?.scopes ?? []),
    metadata: source.metadata,
    connectedAt: new Date(),
    lastError: null,
  });
}
