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
  zkteco: {
    protocol: string;
    realtime: boolean;
    cloudServer: {
      host: string;
      path: string;
      portHint: string;
      protocol: string;
      origin: string;
    };
    endpoints: {
      cdata: { method: string; url: string; description: string };
      getrequest: { method: string; url: string; description: string };
      ping: { method: string; url: string; description: string };
      devicecmd: { method: string; url: string; description: string };
    };
    identifyBy: string;
    setup: string[];
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
  const raw = (appUrl || "http://localhost:3000").replace(/\/$/, "");
  const base = raw.includes("://") ? raw : `https://${raw}`;
  let origin: URL;
  try {
    origin = new URL(base);
  } catch {
    origin = new URL("http://localhost:3000");
  }
  const punchUrl = `${origin.origin}/api/attendance/device`;
  const syncUrl = `${origin.origin}/api/attendance/device/sync`;

  return {
    version: "2.0",
    appUrl: base,
    realtime: {
      transport: "SSE",
      url: `${base}/api/events`,
      events: ["attendance_updated", "device_ping"],
      description:
        "ZKTeco terminals at every branch push punches over ADMS. Dashboards refresh live via SSE.",
    },
    authentication: {
      headers: ["X-Device-Key: <api-key>", "Authorization: Bearer <api-key>"],
      envMasterKey: "ATTENDANCE_DEVICE_API_KEY",
    },
    endpoints: {
      punch: {
        method: "POST",
        url: punchUrl,
        description: "Optional REST punch for kiosk/mobile apps (not used by ZKTeco hardware)",
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
    zkteco: {
      protocol: "ADMS / iclock",
      realtime: true,
      cloudServer: {
        host: origin.hostname,
        path: "/iclock",
        portHint: origin.port || (origin.protocol === "https:" ? "443" : "80"),
        protocol: origin.protocol.replace(":", "") || "https",
        origin: origin.origin,
      },
      endpoints: {
        cdata: {
          method: "GET/POST",
          url: `${base}/iclock/cdata`,
          description: "Handshake and ATTLOG push from each branch terminal",
        },
        getrequest: {
          method: "GET",
          url: `${base}/iclock/getrequest`,
          description: "Device polls for commands and keep-alive",
        },
        ping: {
          method: "GET",
          url: `${base}/iclock/ping`,
          description: "Online heartbeat by serial number",
        },
        devicecmd: {
          method: "POST",
          url: `${base}/iclock/devicecmd`,
          description: "Command acknowledgement from the terminal",
        },
      },
      identifyBy:
        "Device PIN maps to Employee biometric PIN (numeric), then employee code (EMP001 → 1)",
      setup: [
        "Create a branch for each office location with the local timezone",
        "Register the ZKTeco terminal with its Serial Number and assign it to that branch",
        "Enter the hardware Device IP (the machine’s own address) and Confirm — transfer is real-time PUSH",
        "Enroll staff on the terminal using their biometric PIN from the employee profile",
        "Punches appear on Attendance in real time, tagged with the branch device",
      ],
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

export const DEVICE_LIVE_MS = 3 * 60 * 1000;
/** Stay connected between punches. Only drop after a long silence (off / no internet). */
export const DEVICE_CONNECTED_MS = 18 * 60 * 60 * 1000;

export function isDeviceLive(lastSeenAt: Date | string | null) {
  return isDeviceOnline(lastSeenAt, DEVICE_LIVE_MS);
}

export function isDeviceOnline(lastSeenAt: Date | string | null, windowMs = DEVICE_CONNECTED_MS) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < windowMs;
}
