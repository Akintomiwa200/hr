"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import type { PayrollSettingsData } from "@/lib/payroll-types";

const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function PayrollSettingsPanel({
  settings,
}: {
  settings: PayrollSettingsData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save payroll settings"));
        return;
      }
      notify.success("Payroll settings saved");
      setOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to save payroll settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Settings2 className="w-4 h-4" />
        Payroll settings
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Payroll settings" size="lg">
        <div className="space-y-4">
          <Card className="p-4 bg-violet-50/40 border-violet-100">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-900">Pro-rata salary</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pay staff based on days they came to work instead of the full monthly amount.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.proRataSalaryEnabled}
                onChange={(e) =>
                  setForm({ ...form, proRataSalaryEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-violet-600"
              />
            </label>
          </Card>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Working days per week
            </label>
            <select
              className={`${inputClass} mt-1`}
              value={form.workingDaysPerWeek}
              onChange={(e) =>
                setForm({ ...form, workingDaysPerWeek: Number(e.target.value) })
              }
            >
              <option value={5}>5-day week (Mon–Fri)</option>
              <option value={6}>6-day week (Mon–Sat)</option>
            </select>
          </div>

          <Card className="p-4 bg-violet-50/40 border-violet-100">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-gray-900">Holiday allowance</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add a fixed holiday allowance to each payroll run when enabled.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.holidayAllowanceEnabled}
                onChange={(e) =>
                  setForm({ ...form, holidayAllowanceEnabled: e.target.checked })
                }
                className="w-5 h-5 accent-violet-600"
              />
            </label>
            {form.holidayAllowanceEnabled && (
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-3`}
                value={form.holidayAllowanceAmount}
                onChange={(e) =>
                  setForm({ ...form, holidayAllowanceAmount: Number(e.target.value) })
                }
                placeholder="Allowance amount"
              />
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Lateness deduction / day
              </label>
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-1`}
                value={form.latenessDeductionPerDay}
                onChange={(e) =>
                  setForm({ ...form, latenessDeductionPerDay: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Absence deduction / day
              </label>
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-1`}
                value={form.absenceDeductionPerDay}
                onChange={(e) =>
                  setForm({ ...form, absenceDeductionPerDay: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">
                Tax rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={`${inputClass} mt-1`}
                value={form.taxRatePercent}
                onChange={(e) =>
                  setForm({ ...form, taxRatePercent: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.damageDeductionEnabled}
                  onChange={(e) =>
                    setForm({ ...form, damageDeductionEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-violet-600"
                />
                Allow damage deductions
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={save}>
            Save settings
          </Button>
        </div>
      </Dialog>
    </>
  );
}
