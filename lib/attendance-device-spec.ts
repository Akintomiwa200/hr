export type AttendanceDeviceSpec = {
  version: string;
  appUrl: string;
  realtime: {
    transport: "SSE";
    url: string;
    events: string[];
    description: string;
  };
  authentication: {
    headers: string[];
    envMasterKey: string;
  };
  endpoints: {
    punch: { method: string; url: string; description: string };
    sync: { method: string; url: string; description: string };
    health: { method: string; url: string; description: string };
    docs: { method: string; url: string; description: string };
  };
  punchRequest: {
    action: string[];
    identifyBy: string[];
    bodyExample: Record<string, unknown>;
  };
  syncRequest: {
    bodyExample: Record<string, unknown>;
  };
  responses: {
    punchSuccess: Record<string, unknown>;
    syncSuccess: Record<string, unknown>;
    errors: { status: number; error: string }[];
  };
};

export function buildAttendanceDeviceSpec(appUrl: string): AttendanceDeviceSpec {
  const base = appUrl.replace(/\/$/, "");
  const punchUrl = `${base}/api/attendance/device`;
  const syncUrl = `${base}/api/attendance/device/sync`;

  return {
    version: "1.0",
    appUrl: base,
    realtime: {
      transport: "SSE",
      url: `${base}/api/events`,
      events: ["attendance_updated", "device_ping"],
      description:
        "Dashboard and attendance pages refresh when devices punch. device_ping fires on each device health check.",
    },
    authentication: {
      headers: ["X-Device-Key: <api-key>", "Authorization: Bearer <api-key>"],
      envMasterKey: "ATTENDANCE_DEVICE_API_KEY",
    },
    endpoints: {
      punch: {
        method: "POST",
        url: punchUrl,
        description: "Record check-in, check-out, or auto-toggle for one employee",
      },
      sync: {
        method: "POST",
        url: syncUrl,
        description: "Batch replay offline punches from kiosk or mobile app",
      },
      health: {
        method: "GET",
        url: punchUrl,
        description: "Ping server, update last-seen, return capabilities",
      },
      docs: {
        method: "GET",
        url: `${base}/api/attendance/device/docs`,
        description: "Full integration spec for HR admins (session auth)",
      },
    },
    punchRequest: {
      action: ["check_in", "check_out", "toggle"],
      identifyBy: ["employeeId", "employeeCode", "email"],
      bodyExample: {
        action: "toggle",
        employeeCode: "EMP001",
        timestamp: new Date().toISOString(),
        externalId: "device-event-12345",
      },
    },
    syncRequest: {
      bodyExample: {
        events: [
          {
            action: "check_in",
            employeeCode: "EMP001",
            timestamp: new Date().toISOString(),
            externalId: "offline-001",
          },
        ],
      },
    },
    responses: {
      punchSuccess: {
        success: true,
        action: "check_in",
        employeeId: "…",
        checkIn: "…",
        checkOut: null,
        status: "PRESENT",
        method: "DEVICE",
      },
      syncSuccess: {
        success: true,
        processed: 1,
        results: [{ ok: true, duplicate: false }],
      },
      errors: [
        { status: 401, error: "Invalid device API key" },
        { status: 404, error: "Employee not found" },
        { status: 409, error: "Attendance already completed for today" },
      ],
    },
  };
}

export function isDeviceOnline(lastSeenAt: Date | string | null, windowMs = 5 * 60 * 1000) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < windowMs;
}
