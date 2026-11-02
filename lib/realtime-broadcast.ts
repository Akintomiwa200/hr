import { broadcastEvent, type RealtimeEventType } from "@/lib/events";

/**
 * Server-only fan-out: push the domain event to connected clients and forward
 * it to a company's custom webhook when one is connected.
 */
export function broadcastAppEvent(
  type: RealtimeEventType,
  data?: Record<string, unknown>
) {
  broadcastEvent(type, data);
  broadcastEvent("dashboard_updated", { source: type, ...data });

  const companyId = typeof data?.companyId === "string" ? data.companyId : null;
  if (companyId && !type.startsWith("integration_")) {
    void import("@/lib/integrations/custom-webhook")
      .then(({ sendCustomWebhookEvent }) => sendCustomWebhookEvent(companyId, type))
      .catch(() => undefined);
  }
}
