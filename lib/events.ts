export type RealtimeEventType =
  | "dashboard_updated"
  | "employee_updated"
  | "leave_updated"
  | "attendance_updated"
  | "device_ping"
  | "announcement_created"
  | "payroll_updated"
  | "performance_updated"
  | "appraisal_updated"
  | "department_updated"
  | "job_updated"
  | "interview_updated"
  | "document_updated"
  | "folder_updated"
  | "letter_updated"
  | "checklist_updated"
  | "holiday_updated"
  | "integration_sync"
  | "integration_webhook"
  | "integration_updated"
  | "settings_updated"
  | "subscription_updated"
  | "notification_updated";

export type RealtimeEvent = {
  type: RealtimeEventType;
  data?: Record<string, unknown>;
  timestamp: number;
};

type Listener = (event: RealtimeEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(type: RealtimeEventType, data?: Record<string, unknown>) {
    const event: RealtimeEvent = { type, data, timestamp: Date.now() };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const eventBus = new EventBus();

export function broadcastEvent(
  type: RealtimeEventType,
  data?: Record<string, unknown>
) {
  eventBus.publish(type, data);
}

export function isSseHandshake(
  type?: string | null,
  data?: Record<string, unknown> | null
) {
  return type === "dashboard_updated" && data?.connected === true;
}
