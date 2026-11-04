import { eventBus, type RealtimeEventType } from "@/lib/events";

/**
 * Publish a chat event to a specific set of users only.
 *
 * The SSE endpoint reads `data.userIds`, drops the event for anyone outside the
 * list, and strips the list before sending it to the browser. This keeps
 * private conversations out of every other user's event stream.
 */
export function broadcastChatEvent(
  type: RealtimeEventType,
  data: Record<string, unknown>,
  userIds: string[]
) {
  const audience = Array.from(new Set(userIds.filter(Boolean)));
  if (audience.length === 0) return;
  eventBus.publish(type, { ...data, userIds: audience });
}
