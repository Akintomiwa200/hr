"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Save, UserMinus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

type Settings = {
  noticePeriodDays: number;
  managerEndorsementRequired: boolean;
  hrApprovalRequired: boolean;
  autoStartOffboarding: boolean;
  allowWithdrawal: boolean;
};

const DEFAULTS: Settings = {
  noticePeriodDays: 30,
  managerEndorsementRequired: true,
  hrApprovalRequired: true,
  autoStartOffboarding: true,
  allowWithdrawal: true,
};

const TOGGLES: { key: keyof Settings; title: string; description: string }[] = [
  {
    key: "managerEndorsementRequired",
    title: "Manager endorsement",
    description: "The employee's line manager must endorse before HR reviews.",
  },
  {
    key: "hrApprovalRequired",
    title: "HR approval",
    description: "HR or a company admin must approve the resignation.",
  },
  {
    key: "autoStartOffboarding",
    title: "Auto-start offboarding",
    description: "Start the exit checklist as soon as the resignation is approved.",
  },
  {
    key: "allowWithdrawal",
    title: "Allow withdrawal",
    description: "Employees can withdraw while the resignation is still pending.",
  },
];

export function ResignationSettingsCard() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/resignation/settings")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: Settings) => {
        if (!active) return;
        setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/resignation/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save resignation settings"));
        return;
      }
      notify.success("Resignation settings saved");
    } catch {
      notify.error("Could not save resignation settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CalendarClock className="h-4 w-4 text-violet-600" />
            Notice period
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Default last working day offered when an employee starts a resignation.
          </p>
          <div className="mt-4 flex items-center gap-2 max-w-xs">
            <input
              type="number"
              min={0}
              max={365}
              className={inputClass}
              value={loaded ? settings.noticePeriodDays : ""}
              placeholder="Days"
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  noticePeriodDays: Number(e.target.value),
                }))
              }
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserMinus className="h-4 w-4 text-violet-600" />
            Approval workflow
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Choose which stages a resignation must pass before offboarding begins.
          </p>
          <div className="mt-4 divide-y divide-gray-100">
            {TOGGLES.map((toggle) => (
              <label
                key={toggle.key}
                className="flex items-start justify-between gap-4 py-3 cursor-pointer"
              >
                <span>
                  <span className="block text-sm font-medium text-gray-800">
                    {toggle.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {toggle.description}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-violet-600"
                  checked={Boolean(settings[toggle.key])}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      [toggle.key]: e.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={save} loading={saving} disabled={!loaded}>
              <Save className="h-4 w-4" />
              Save settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
