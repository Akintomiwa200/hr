"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui";
import { notify, readApiError } from "@/lib/toast";
import type { AppCurrency } from "@/lib/currency";

export function PlatformCurrencySettings({
  currencyCode,
  options,
}: {
  currencyCode: string;
  options: AppCurrency[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currencyCode);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode: selected }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update currency."));
        return;
      }
      notify.success("Platform currency updated");
      router.refresh();
    } catch {
      notify.error("Could not update currency.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-amber-100 bg-amber-50/30 lg:col-span-3">
      <CardHeader
        title="Platform currency"
        description="Default denomination for salaries, payroll, and job offers across the whole app. Only Super Admin can change this."
      />
      <div className="px-6 pb-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Active denomination
            </label>
            <select
              className="w-full max-w-md px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.symbol} {opt.label} ({opt.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Default is Nigerian Naira (₦). Changing this updates how amounts display for every company.
            </p>
            <Button loading={loading} onClick={save} disabled={selected === currencyCode}>
              Save currency
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
