"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function LeaveActions({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    await fetch(`/api/leave/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => handleAction("approve")}
        loading={loading === "approve"}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => handleAction("reject")}
        loading={loading === "reject"}
      >
        Reject
      </Button>
    </div>
  );
}
