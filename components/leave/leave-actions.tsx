"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { notify, readApiError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function LeaveActions({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    const res = await fetch(`/api/leave/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      notify.error(await readApiError(res, `Failed to ${action} leave request`));
    } else {
      notify.success(action === "approve" ? "Leave request approved" : "Leave request rejected");
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => handleAction("approve")}
        disabled={!!loading}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg",
          "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        )}
      >
        <Check className="w-3.5 h-3.5" />
        {loading === "approve" ? "..." : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => handleAction("reject")}
        disabled={!!loading}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg",
          "bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        )}
      >
        <X className="w-3.5 h-3.5" />
        {loading === "reject" ? "..." : "Reject"}
      </button>
    </div>
  );
}
