import type { IntegrationProvider } from "@/lib/integrations/types";

const DC_SUFFIX: Record<string, string> = {
  us: "com",
  eu: "eu",
  in: "in",
  au: "com.au",
  jp: "jp",
  ca: "ca",
  sa: "sa",
  uk: "uk",
};

export function inferZohoLocation(value?: string | null) {
  const raw = (value ?? "").toLowerCase();
  if (!raw) return "us";
  if (raw === "us" || raw === "eu" || raw === "in" || raw === "au" || raw === "jp" || raw === "ca" || raw === "sa" || raw === "uk") {
    return raw;
  }
  if (raw.includes("zoho.eu") || raw.includes("zohoapis.eu")) return "eu";
  if (raw.includes("zoho.in") || raw.includes("zohoapis.in")) return "in";
  if (raw.includes("zoho.com.au") || raw.includes("zohoapis.com.au")) return "au";
  if (raw.includes("zoho.jp") || raw.includes("zohoapis.jp")) return "jp";
  if (raw.includes("zoho.ca") || raw.includes("zohoapis.ca")) return "ca";
  if (raw.includes("zoho.sa") || raw.includes("zohoapis.sa")) return "sa";
  if (raw.includes("zoho.uk") || raw.includes("zohoapis.uk")) return "uk";
  return "us";
}

function suffixFor(location: string) {
  return DC_SUFFIX[location] ?? "com";
}

export function zohoPeopleOrigin(location: string) {
  return `https://people.zoho.${suffixFor(location)}`;
}

export function zohoRecruitOrigin(location: string) {
  return `https://recruit.zoho.${suffixFor(location)}`;
}

export function zohoSignOrigin(location: string) {
  return `https://sign.zoho.${suffixFor(location)}`;
}

export function zohoMailOrigin(location: string) {
  return `https://mail.zoho.${suffixFor(location)}`;
}

export function zohoApisOrigin(location: string) {
  const suffix = suffixFor(location);
  return suffix === "com" ? "https://www.zohoapis.com" : `https://www.zohoapis.${suffix}`;
}

export function zohoLocationFromMeta(meta: Record<string, unknown>) {
  return inferZohoLocation(
    (meta.location as string) ||
      (meta.accountsServer as string) ||
      (meta.apiDomain as string)
  );
}

export function zohoOriginForPath(
  provider: IntegrationProvider,
  path: string,
  meta: Record<string, unknown>
) {
  const location = zohoLocationFromMeta(meta);
  if (path.startsWith("/people/") || provider === "ZOHO_PEOPLE") {
    return zohoPeopleOrigin(location);
  }
  if (path.startsWith("/recruit/") || provider === "ZOHO_RECRUIT") {
    return zohoRecruitOrigin(location);
  }
  if (path.startsWith("/sign/") || path.startsWith("/api/v1/") || provider === "ZOHO_SIGN") {
    return zohoSignOrigin(location);
  }
  if (path.startsWith("/mail/") || provider === "ZOHO_MAIL") {
    return zohoMailOrigin(location);
  }
  return zohoApisOrigin(location);
}
