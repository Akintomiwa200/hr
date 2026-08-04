import { broadcastEvent } from "@/lib/events";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { logSyncEvent } from "@/lib/integrations/store";

export async function broadcastIntegrationSync(
  provider: IntegrationProvider,
  data: Record<string, unknown>
) {
  broadcastEvent("integration_sync", { provider, ...data });
}

export async function broadcastIntegrationWebhook(
  provider: IntegrationProvider,
  eventType: string,
  data: Record<string, unknown>
) {
  broadcastEvent("integration_webhook", { provider, eventType, ...data });
}

export async function recordAndBroadcast(
  integrationId: string,
  provider: IntegrationProvider,
  input: {
    direction: "inbound" | "outbound";
    eventType: string;
    summary: string;
    payload?: unknown;
    broadcastType?: "sync" | "webhook";
  }
) {
  await logSyncEvent(integrationId, {
    direction: input.direction,
    eventType: input.eventType,
    summary: input.summary,
    payload: input.payload,
  });

  if (input.broadcastType === "webhook") {
    broadcastIntegrationWebhook(provider, input.eventType, {
      summary: input.summary,
    });
  } else {
    broadcastIntegrationSync(provider, {
      eventType: input.eventType,
      summary: input.summary,
    });
  }
}
