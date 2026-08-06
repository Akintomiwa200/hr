import { broadcastEvent, type RealtimeEventType } from "@/lib/events";

/** Broadcast a domain event and a dashboard refresh ping for all connected clients. */
export function broadcastAppEvent(
  type: RealtimeEventType,
  data?: Record<string, unknown>
) {
  broadcastEvent(type, data);
  broadcastEvent("dashboard_updated", { source: type, ...data });
}
