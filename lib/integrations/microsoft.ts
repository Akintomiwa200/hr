import type { IntegrationRecord } from "@/lib/integrations/types";
import { getIntegration, upsertIntegration, parseMetadata } from "@/lib/integrations/store";
import { getCatalogItem } from "@/lib/integrations/catalog";
import { randomBytes } from "crypto";

const provider = "MICROSOFT_365" as const;
const tenant = () => process.env.MICROSOFT_TENANT_ID?.trim() || "common";
const redirectUri = (origin: string) => `${origin.replace(/\/$/, "")}/api/integrations/microsoft-365/callback`;

export function isMicrosoft365Configured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function getMicrosoft365AuthUrl(state: string, origin: string) {
  if (!isMicrosoft365Configured()) return null;
  const url = new URL(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize`);
  url.search = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(origin),
    response_mode: "query",
    scope: (getCatalogItem(provider)?.scopes ?? []).join(" "),
    state,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error_description || "Microsoft OAuth request failed"));
  return payload;
}

export async function exchangeMicrosoft365Code(code: string, companyId: string | null, origin: string) {
  if (!isMicrosoft365Configured()) throw new Error("Microsoft 365 OAuth is not configured");
  const tokens = await tokenRequest(new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(origin),
    scope: (getCatalogItem(provider)?.scopes ?? []).join(" "),
  }));
  const accessToken = String(tokens.access_token || "");
  if (!accessToken) throw new Error("Microsoft did not return an access token");
  const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const me = await meRes.json() as Record<string, unknown>;
  if (!meRes.ok) throw new Error(String((me.error as Record<string, unknown> | undefined)?.message || "Could not read Microsoft profile"));
  return upsertIntegration(provider, companyId, {
    status: "CONNECTED", accessToken, refreshToken: String(tokens.refresh_token || "") || null,
    expiryDate: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
    accountEmail: String(me.mail || me.userPrincipalName || "") || null,
    accountId: String(me.id || "") || null,
    scopes: JSON.stringify(getCatalogItem(provider)?.scopes ?? []),
    metadata: JSON.stringify({ tenantId: tokens.tenant_id || tenant() }),
    connectedAt: new Date(), lastError: null,
  });
}

async function refreshMicrosoftToken(integration: IntegrationRecord) {
  if (!integration.refreshToken) throw new Error("Microsoft connection expired. Reconnect it to continue.");
  const tokens = await tokenRequest(new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: integration.refreshToken,
    scope: (getCatalogItem(provider)?.scopes ?? []).join(" "),
  }));
  return upsertIntegration(provider, integration.companyId, {
    accessToken: String(tokens.access_token || integration.accessToken || ""),
    refreshToken: String(tokens.refresh_token || integration.refreshToken),
    expiryDate: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
  });
}

export async function microsoftGraphFetch(integration: IntegrationRecord, path: string, init?: RequestInit) {
  let current = integration;
  if (!current.expiryDate || current.expiryDate.getTime() < Date.now() + 60_000) current = await refreshMicrosoftToken(current);
  const response = await fetch(path.startsWith("https://") ? path : `https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${current.accessToken}`, Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String((payload.error as Record<string, unknown> | undefined)?.message || `Microsoft Graph returned ${response.status}`));
  return payload;
}

export async function ensureMicrosoftDirectorySubscription(companyId: string | null) {
  const integration = await getIntegration(provider, companyId);
  if (!integration?.accessToken) throw new Error("Microsoft 365 is not connected");
  const metadata = parseMetadata(integration);
  const expiry = typeof metadata.subscriptionExpiration === "string" ? Date.parse(metadata.subscriptionExpiration) : 0;
  if (metadata.subscriptionId && expiry > Date.now() + 30 * 60 * 1000) return;
  const clientState = typeof metadata.subscriptionClientState === "string" ? metadata.subscriptionClientState : randomBytes(32).toString("hex");
  const baseUrl = process.env.APP_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!baseUrl?.startsWith("https://")) throw new Error("Set APP_URL to your public HTTPS app URL to enable Microsoft 365 live updates");
  const expirationDateTime = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  const result = await microsoftGraphFetch(integration, "/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      changeType: "created,updated,deleted",
      notificationUrl: `${baseUrl}/api/webhooks/microsoft-365?companyId=${encodeURIComponent(companyId ?? "")}`,
      resource: "/users",
      expirationDateTime,
      clientState,
    }),
  });
  if (typeof result.id !== "string") throw new Error("Microsoft Graph did not create a directory change subscription");
  await upsertIntegration(provider, companyId, {
    metadata: JSON.stringify({ ...metadata, subscriptionId: result.id, subscriptionExpiration: result.expirationDateTime || expirationDateTime, subscriptionClientState: clientState }),
  });
}

export async function syncMicrosoftDirectory(integration: IntegrationRecord) {
  await ensureMicrosoftDirectorySubscription(integration.companyId);
  const select = "$select=id,displayName,mail,userPrincipalName,jobTitle,department,mobilePhone&$top=999";
  let payload = await microsoftGraphFetch(integration, `/users?${select}`);
  const users: Record<string, unknown>[] = [];
  while (true) {
    if (Array.isArray(payload.value)) users.push(...payload.value as Record<string, unknown>[]);
    const next = payload["@odata.nextLink"];
    if (typeof next !== "string" || users.length >= 50_000) break;
    payload = await microsoftGraphFetch(integration, next);
  }
  let updated = 0;
  for (const user of users) {
    const email = String(user.mail || user.userPrincipalName || "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const existing = await prismaEmployeeByEmail(email, integration.companyId);
    if (!existing) continue;
    const parts = String(user.displayName || "").trim().split(/\s+/);
    const [firstName, ...rest] = parts;
    const departmentName = typeof user.department === "string" ? user.department.trim() : "";
    let departmentId: string | undefined;
    if (departmentName) {
      const department = await prisma.department.findFirst({
        where: { name: { equals: departmentName, mode: "insensitive" }, companyId: integration.companyId },
        select: { id: true },
      });
      departmentId = department?.id ?? (await prisma.department.create({
        data: { name: departmentName, companyId: integration.companyId, description: "Imported from Microsoft 365" },
        select: { id: true },
      })).id;
    }
    await updateEmployeeFromDirectory(existing.id, {
      ...(firstName ? { firstName } : {}),
      ...(rest.length ? { lastName: rest.join(" ") } : {}),
      ...(typeof user.jobTitle === "string" && user.jobTitle ? { jobTitle: user.jobTitle } : {}),
      ...(typeof user.mobilePhone === "string" && user.mobilePhone ? { phone: user.mobilePhone } : {}),
      ...(departmentId ? { departmentId } : {}),
    });
    updated++;
  }
  return { synced: updated, summary: `Microsoft 365: refreshed ${updated} matching employee profiles from ${users.length} directory users` };
}

import { prisma } from "@/lib/prisma";
async function prismaEmployeeByEmail(email: string, companyId: string | null) {
  return prisma.employee.findFirst({ where: { email: { equals: email, mode: "insensitive" }, user: { companyId } }, select: { id: true } });
}
async function updateEmployeeFromDirectory(id: string, data: Record<string, string>) {
  return prisma.employee.update({ where: { id }, data });
}
