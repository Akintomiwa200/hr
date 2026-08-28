import type { NextRequest } from "next/server";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { isDummyAppUrl, resolveAppUrl } from "@/lib/app-url";

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/google/callback";
/** Alternate callback registered in some Google Cloud Console setups. */
export const GOOGLE_OAUTH_CALLBACK_PATH_LEGACY = "/api/auth/callback/google";
export const ZOHO_OAUTH_CALLBACK_PATH = "/api/integrations/zoho/callback";

export type OAuthRedirectContext = {
  request?: NextRequest;
  origin?: string;
};

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

function oauthOrigin(ctx?: OAuthRedirectContext) {
  if (ctx?.origin) return trimSlash(ctx.origin);
  if (ctx?.request) return resolveAppUrl({ request: ctx.request });
  return resolveAppUrl();
}

function resolveRedirectUri(
  envValue: string | undefined,
  fallbackPath: string,
  ctx?: OAuthRedirectContext
) {
  const liveOrigin = oauthOrigin(ctx);
  const explicit = envValue?.trim();

  if (explicit) {
    const url = trimSlash(explicit);
    if (/\/api\//i.test(url)) {
      try {
        const parsed = new URL(url.includes("://") ? url : `http://${url}`);
        if (isDummyAppUrl(url) && !isDummyAppUrl(liveOrigin)) {
          return `${liveOrigin}${parsed.pathname}${parsed.search}`;
        }
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
      } catch {
        return url;
      }
    }
    return `${trimSlash(explicit)}${fallbackPath}`;
  }

  return `${liveOrigin}${fallbackPath}`;
}

/**
 * Must match Authorized redirect URIs in Google Cloud Console.
 */
export function getGoogleRedirectUri(ctx?: OAuthRedirectContext) {
  return resolveRedirectUri(
    process.env.GOOGLE_REDIRECT_URI,
    GOOGLE_OAUTH_CALLBACK_PATH,
    ctx
  );
}

/**
 * Single Zoho redirect URI for every Zoho product (provider is in OAuth state).
 */
export function getZohoRedirectUri(_provider?: IntegrationProvider, ctx?: OAuthRedirectContext) {
  return resolveRedirectUri(process.env.ZOHO_REDIRECT_URI, ZOHO_OAUTH_CALLBACK_PATH, ctx);
}

/** @deprecated Use resolveAppUrl() — kept for older imports. */
export function getOAuthAppOrigin(ctx?: OAuthRedirectContext) {
  return oauthOrigin(ctx);
}
