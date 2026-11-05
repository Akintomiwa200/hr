import { isSseHandshake, type RealtimeEventType } from "@/lib/events";

export type RealtimeHandler = (
  type?: RealtimeEventType,
  data?: Record<string, unknown>
) => void;

export type RealtimeStatusHandler = (connected: boolean) => void;

let source: EventSource | null = null;
let subscriberCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 1000;
const handlers = new Set<RealtimeHandler>();
const statusHandlers = new Set<RealtimeStatusHandler>();

function dispatch(type?: RealtimeEventType, data?: Record<string, unknown>) {
  if (isSseHandshake(type, data)) return;
  for (const handler of handlers) {
    handler(type, data);
  }
}

function emitStatus(connected: boolean) {
  for (const handler of statusHandlers) {
    try {
      handler(connected);
    } catch {
      // A failing status listener must not break the shared stream.
    }
  }
}

function connect() {
  if (typeof window === "undefined" || subscriberCount === 0) return;

  try {
    source?.close();
    source = new EventSource("/api/events");
    source.onopen = () => {
      backoffMs = 1000;
      emitStatus(true);
    };
    source.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as {
          type?: RealtimeEventType;
          data?: Record<string, unknown>;
        };
        dispatch(parsed.type, parsed.data);
      } catch {
        // ignore heartbeat comments / malformed payloads
      }
    };
    source.onerror = () => {
      source?.close();
      source = null;
      emitStatus(false);
      if (subscriberCount === 0) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, 30_000);
        connect();
      }, backoffMs);
    };
  } catch {
    // SSE unavailable — subscribers can use their own fallbacks
  }
}

function teardownIfIdle() {
  if (subscriberCount > 0) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  source?.close();
  source = null;
  emitStatus(false);
}

/** One shared browser SSE connection for the whole app. */
export function subscribeRealtime(handler: RealtimeHandler) {
  handlers.add(handler);
  subscriberCount += 1;
  connect();

  return () => {
    handlers.delete(handler);
    subscriberCount = Math.max(0, subscriberCount - 1);
    teardownIfIdle();
  };
}

/**
 * Observe whether the shared stream is connected. Handlers are told about
 * reconnects so they can re-sync data that changed while the connection was
 * down (SSE does not replay missed events).
 */
export function subscribeRealtimeStatus(handler: RealtimeStatusHandler) {
  statusHandlers.add(handler);
  if (source && source.readyState === EventSource.OPEN) {
    handler(true);
  }

  return () => {
    statusHandlers.delete(handler);
  };
}
