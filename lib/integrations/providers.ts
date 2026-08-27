import type { IntegrationProvider } from "@/lib/integrations/types";

const SLUG_TO_PROVIDER: Record<string, IntegrationProvider> = {
  "google-workspace": "GOOGLE_WORKSPACE",
  "zoho-people": "ZOHO_PEOPLE",
  "zoho-recruit": "ZOHO_RECRUIT",
  "zoho-books": "ZOHO_BOOKS",
  "zoho-sign": "ZOHO_SIGN",
  "zoho-mail": "ZOHO_MAIL",
};

export function providerToSlug(provider: IntegrationProvider) {
  return provider.toLowerCase().replace(/_/g, "-");
}

export function slugToProvider(slug: string): IntegrationProvider | null {
  return SLUG_TO_PROVIDER[slug] ?? null;
}

export function encodeOAuthState(input: {
  userId: string;
  companyId?: string | null;
  provider?: IntegrationProvider;
}) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function decodeOAuthState(state: string): {
  userId: string;
  companyId?: string | null;
  provider?: IntegrationProvider;
} | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId: string;
      companyId?: string | null;
      provider?: IntegrationProvider;
    };
  } catch {
    return null;
  }
}
