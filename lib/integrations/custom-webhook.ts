import { createHmac, randomUUID } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { getIntegration, parseMetadata } from "@/lib/integrations/store";
import type { IntegrationRecord } from "@/lib/integrations/types";

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:");
}

async function getEndpoint(integration: IntegrationRecord) {
  const endpoint = String(parseMetadata(integration).endpointUrl || "");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !integration.accessToken || isIP(url.hostname)) throw new Error("Custom webhook endpoint is not configured");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Custom webhook endpoint must resolve to a public server");
  return { url, secret: integration.accessToken };
}

export async function deliverCustomWebhook(integration: IntegrationRecord, event: string) {
  const { url, secret } = await getEndpoint(integration);
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({
    id: randomUUID(),
    event,
    occurredAt: timestamp,
    companyId: integration.companyId,
    integration: String(parseMetadata(integration).endpointName || "Custom platform"),
  });
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SmartHR-Timestamp": timestamp, "X-SmartHR-Signature": signature },
    body,
    signal: AbortSignal.timeout(8_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Custom webhook returned HTTP ${response.status}`);
  return { synced: 1, summary: `Custom webhook delivered ${event}` };
}

export async function sendCustomWebhookEvent(companyId: string, event: string) {
  const integration = await getIntegration("CUSTOM_WEBHOOK", companyId);
  if (!integration || integration.status !== "CONNECTED") return;
  await deliverCustomWebhook(integration, event);
}

export async function syncCustomWebhook(integration: IntegrationRecord) {
  return deliverCustomWebhook(integration, "integration.test");
}
