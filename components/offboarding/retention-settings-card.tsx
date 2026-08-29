"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

type SettingsResponse = { retentionDays: number };

export function RetentionSettingsCard() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/offboarding/settings")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: SettingsResponse) => {
        if (!active) return;
        setRetentionDays(data.retentionDays);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/offboarding/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save setting"));
        return;
      }
      notify.success("Retention updated", `Offboarded staff are kept ${retentionDays} days.`);
    } catch {
      notify.error("Could not save setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-violet-600" />
          Offboarding retention
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          How many days to keep an offboarded staff record before it is permanently deleted from the database.
        </p>
        <div className="flex items-center gap-2 mt-4 max-w-xs">
          <input
            type="number"
            min={0}
            max={365}
            className={inputClass}
            value={loaded ? retentionDays : ""}
            placeholder="Days"
            onChange={(e) => setRetentionDays(Number(e.target.value))}
          />
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Manage offboarded staff and delete records on the{" "}
          <Link
            href="/offboarded-staff"
            className="text-violet-600 hover:underline font-medium"
          >
            Delete & Separations
          </Link>{" "}
          page.
        </p>
      </div>
    </Card>
  );
}
