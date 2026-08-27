import type { IntegrationProvider } from "@/lib/integrations/types";

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/google/callback";
export const ZOHO_OAUTH_CALLBACK_PATH = "/api/integrations/zoho/callback";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/** Origin for OAuth redirects — always from .env, including localhost. */
export function getOAuthAppOrigin() {
  return trimSlash(
    process.env.APP_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000"
  );
}

function envRedirectOrPath(envValue: string | undefined, fallbackPath: string) {
  const explicit = envValue?.trim();
  if (explicit) {
    const url = trimSlash(explicit);
    if (/\/api\//i.test(url)) return url;
    return `${url}${fallbackPath}`;
  }
  return `${getOAuthAppOrigin()}${fallbackPath}`;
}

/**
 * Must match Authorized redirect URIs in Google Cloud Console.
 * Defaults to /api/google/callback — the URI this app originally registered.
 */
export function getGoogleRedirectUri() {
  return envRedirectOrPath(process.env.GOOGLE_REDIRECT_URI, GOOGLE_OAUTH_CALLBACK_PATH);
}

/**
 * Single Zoho redirect URI for every Zoho product (provider is in OAuth state).
 * Must match the Authorized Redirect URI on the Zoho API client.
 */
export function getZohoRedirectUri(_provider?: IntegrationProvider) {
  return envRedirectOrPath(process.env.ZOHO_REDIRECT_URI, ZOHO_OAUTH_CALLBACK_PATH);
}
