"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

export function GoogleCalendarConnect() {
  const router = useRouter();
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    email: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/google/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false, email: null }));
  }, []);

  const disconnect = async () => {
    setLoading(true);
    const res = await fetch("/api/google/status", { method: "DELETE" });
    if (!res.ok) {
      notify.error(await readApiError(res, "Failed to disconnect Google Calendar"));
    } else {
      notify.success("Google Calendar disconnected");
    }
    router.refresh();
    const statusRes = await fetch("/api/google/status");
    setStatus(await statusRes.json());
    setLoading(false);
  };

  if (!status) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Google Calendar & Meet</p>
          {!status.configured ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable calendar sync.
            </p>
          ) : status.connected ? (
            <p className="text-xs text-emerald-700 mt-0.5">
              Connected as {status.email}. Interviews create calendar events with Google Meet links.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Connect to schedule interviews on Google Calendar with automatic Meet links.
            </p>
          )}
        </div>
      </div>
      {status.configured && (
        <div className="flex gap-2">
          {status.connected ? (
            <Button variant="secondary" loading={loading} onClick={disconnect}>
              <Unlink className="w-4 h-4" />
              Disconnect
            </Button>
          ) : (
            <a href="/api/integrations/google-workspace/connect">
              <Button>
                <Link2 className="w-4 h-4" />
                Connect Google
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
