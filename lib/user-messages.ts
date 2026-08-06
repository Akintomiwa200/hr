const ROUTE_ERROR_MESSAGES: Record<string, string> = {
  denied: "Connection was cancelled.",
  exchange: "Could not complete the connection. Please try again.",
  unknown: "Something went wrong with that integration.",
  "not-configured": "This integration is not configured yet.",
  unauthorized: "You are not signed in. Please log in and try again.",
  forbidden: "You do not have permission to do that.",
};

const ROUTE_SUCCESS_MESSAGES: Record<string, string> = {
  connected: "Google Calendar connected successfully.",
  saved: "Changes saved successfully.",
  created: "Created successfully.",
  updated: "Updated successfully.",
  deleted: "Deleted successfully.",
};

function formatSlug(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error == null) return fallback;

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  const code = raw.trim();
  if (ROUTE_ERROR_MESSAGES[code]) return ROUTE_ERROR_MESSAGES[code];

  if (
    code.includes("PrismaClient") ||
    code.includes("Invalid `") ||
    code.includes("does not exist in the current database") ||
    code.includes("Unique constraint")
  ) {
    return "A database error occurred. Please refresh or contact your administrator.";
  }

  if (code.includes("module factory is not available")) {
    return "This page needs a refresh. Please reload and try again.";
  }

  if (
    code.length > 140 ||
    code.includes("node_modules") ||
    code.includes(".next") ||
    code.includes("TURBOPACK") ||
    code.includes("__TURBOPACK__") ||
    /\\/.test(code)
  ) {
    return fallback;
  }

  return code || fallback;
}

export type RouteFeedback = {
  type: "success" | "error";
  message: string;
};

export function feedbackFromSearchParams(params: URLSearchParams): RouteFeedback | null {
  const success = params.get("success");
  if (success) {
    return {
      type: "success",
      message: ROUTE_SUCCESS_MESSAGES[success] ?? formatSlug(success),
    };
  }

  const connected = params.get("connected");
  if (connected) {
    return {
      type: "success",
      message: `${formatSlug(connected)} connected — syncing in real time.`,
    };
  }

  const google = params.get("google");
  if (google === "connected") {
    return { type: "success", message: "Google Calendar connected successfully." };
  }
  if (google === "denied") {
    return { type: "error", message: "Google Calendar connection was cancelled." };
  }
  if (google === "error") {
    return { type: "error", message: "Could not connect Google Calendar. Please try again." };
  }

  const error = params.get("error");
  if (error) {
    const provider = params.get("provider");
    const base = ROUTE_ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.";
    return {
      type: "error",
      message: provider ? `${formatSlug(provider)}: ${base}` : base,
    };
  }

  return null;
}

export const ROUTE_FEEDBACK_KEYS = ["success", "error", "connected", "google", "provider"] as const;
