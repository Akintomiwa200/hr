"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Building2, LoaderCircle } from "lucide-react";
import { notify, readApiError } from "@/lib/toast";

export function CompanyWorkspaceSwitcher({
  companyId,
  companyName,
  exit = false,
}: {
  companyId?: string;
  companyName?: string;
  exit?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchWorkspace() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/company-context", {
        method: exit ? "DELETE" : "POST",
        ...(exit
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId }),
            }),
      });
      if (!response.ok) {
        notify.error(await readApiError(response, "Could not switch company workspace."));
        return;
      }
      router.replace(exit ? "/admin/companies" : "/dashboard");
    } catch {
      notify.error("Could not switch company workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy || (!exit && !companyId)}
      onClick={() => void switchWorkspace()}
      className={exit
        ? "inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-60"
        : "inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-violet-800 disabled:opacity-60"}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : exit ? <ArrowLeftRight className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
      {busy ? "Switching…" : exit ? "Exit company workspace" : `Open ${companyName ?? "company"} workspace`}
    </button>
  );
}
