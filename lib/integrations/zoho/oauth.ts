import type { IntegrationRecord, IntegrationProvider } from "@/lib/integrations/types";
import { getCatalogItem } from "@/lib/integrations/catalog";
import { getZohoRedirectUri } from "@/lib/integrations/oauth-env";
import { upsertIntegration, getIntegration, parseMetadata } from "@/lib/integrations/store";
import { zohoOriginForPath, inferZohoLocation } from "@/lib/integrations/zoho/hosts";

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

function accountsUrlFrom(value?: string | null) {
  const trimmed = value?.replace(/\/$/, "").trim();
  return trimmed || zohoAccountsUrl();
}

export function summarizeZohoErrorBody(text: string, status?: number) {
  const trimmed = text.trim();
  if (!trimmed) return status ? `HTTP ${status}` : "Zoho request failed";
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const response = json.response as Record<string, unknown> | undefined;
    const error = json.error;
    const message =
      (typeof response?.message === "string" && response.message) ||
      (typeof json.message === "string" && json.message) ||
      (typeof error === "string" && error) ||
      (error &&
        typeof error === "object" &&
        "message" in error &&
        String((error as { message: unknown }).message));
    if (message) return message.slice(0, 400);
  } catch {
    // HTML or plain text from the wrong host
  }
  return (
    trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) ||
    (status ? `HTTP ${status}` : "Zoho request failed")
  );
}

function peopleApiFailure(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const error = root.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message || "Zoho People error");
  }
  const response = root.response as Record<string, unknown> | undefined;
  if (!response) return null;
  const status = response.status;
  if (status === 0 || status === "0" || status == null) return null;
  const message = String(response.message || "Zoho People request failed");
  if (/no records/i.test(message)) return null;
  return message;
}

export function getZohoAuthUrl(
  provider: IntegrationProvider,
  state: string,
  _appUrl?: string
) {
  if (!isZohoConfigured()) return null;
  const item = getCatalogItem(provider);
  if (!item) return null;

  const redirectUri = getZohoRedirectUri(provider);
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
  extras?: { location?: string | null; accountsServer?: string | null }
) {
  if (!isZohoConfigured()) throw new Error("Zoho OAuth is not configured");

  const redirectUri = getZohoRedirectUri(provider);
  const accounts = accountsUrlFrom(extras?.accountsServer);
  const tokenUrl = `${accounts}/oauth/v2/token`;

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

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoho token exchange failed: ${summarizeZohoErrorBody(text, res.status)}`);
  }

  const tokens = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    api_domain?: string;
    location?: string;
    error?: string;
  };

  if (!tokens.access_token) {
    throw new Error(
      `Zoho token exchange failed: ${tokens.error || summarizeZohoErrorBody(text)}`
    );
  }

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
      location:
        extras?.location ??
        tokens.location ??
        inferZohoLocation(tokens.api_domain ?? extras?.accountsServer),
      accountsServer: accounts,
    }),
    connectedAt: new Date(),
    lastError: null,
  });
}

export async function refreshZohoToken(integration: IntegrationRecord) {
  if (!integration.refreshToken) throw new Error("No refresh token");

  const meta = parseMetadata(integration);
  const accounts = accountsUrlFrom(
    typeof meta.accountsServer === "string" ? meta.accountsServer : null
  );
  const tokenUrl = `${accounts}/oauth/v2/token`;
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

  const text = await res.text();
  if (!res.ok) throw new Error(summarizeZohoErrorBody(text, res.status));

  const tokens = JSON.parse(text) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokens.access_token) {
    throw new Error(tokens.error || summarizeZohoErrorBody(text));
  }

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

  const meta = parseMetadata(current);
  const origin = zohoOriginForPath(current.provider, path, meta);
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;

  const send = (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });

  let res = await send(current.accessToken);
  if (res.status === 401 && current.refreshToken) {
    current = await refreshZohoToken(current);
    if (!current.accessToken) throw new Error("Zoho not connected");
    res = await send(current.accessToken);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    throw new Error(`Zoho API ${path}: ${summarizeZohoErrorBody(text, res.status)}`);
  }

  if (path.startsWith("/people/")) {
    const failure = peopleApiFailure(payload);
    if (failure) throw new Error(`Zoho People ${path}: ${failure}`);
  }

  return payload ?? {};
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
