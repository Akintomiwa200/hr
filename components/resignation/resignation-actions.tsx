"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { toDateInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Action = "endorse" | "approve" | "reject" | "withdraw" | "complete" | "schedule";

type DialogMode = "reject" | "schedule" | "withdraw" | "complete" | null;

const SUCCESS: Record<Action, string> = {
  endorse: "Resignation endorsed",
  approve: "Resignation approved",
  reject: "Resignation rejected",
  withdraw: "Resignation withdrawn",
  complete: "Resignation completed",
  schedule: "Last working day updated",
};

export function ResignationActions({
  resignationId,
  lastWorkingDay,
  canEndorse,
  canApprove,
  canReject,
  canWithdraw,
  canComplete,
  canSchedule,
}: {
  resignationId: string;
  lastWorkingDay: string;
  canEndorse: boolean;
  canApprove: boolean;
  canReject: boolean;
  canWithdraw: boolean;
  canComplete: boolean;
  canSchedule: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [note, setNote] = useState("");
  const [day, setDay] = useState(toDateInputValue(lastWorkingDay));

  async function run(action: Action, payload?: Record<string, unknown>) {
    setLoading(action);
    try {
      const res = await fetch(`/api/resignation/${resignationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, `Could not ${action} the resignation`));
        return;
      }
      notify.success(SUCCESS[action]);
      setDialog(null);
      setNote("");
      router.refresh();
    } catch {
      notify.error(`Could not ${action} the resignation`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEndorse && (
          <Button size="sm" onClick={() => void run("endorse")} loading={loading === "endorse"}>
            <Check className="w-4 h-4" />
            Endorse
          </Button>
        )}
        {canApprove && (
          <Button size="sm" onClick={() => void run("approve")} loading={loading === "approve"}>
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </Button>
        )}
        {canComplete && (
          <Button size="sm" onClick={() => setDialog("complete")}>
            <CheckCircle2 className="w-4 h-4" />
            Complete exit
          </Button>
        )}
        {canSchedule && (
          <Button size="sm" variant="secondary" onClick={() => setDialog("schedule")}>
            <CalendarClock className="w-4 h-4" />
            Change last day
          </Button>
        )}
        {canReject && (
          <button
            type="button"
            onClick={() => setDialog("reject")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg",
              "bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            )}
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
        )}
        {canWithdraw && (
          <button
            type="button"
            onClick={() => setDialog("withdraw")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Withdraw
          </button>
        )}
      </div>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title="Reject resignation"
        description="The employee will be notified. Add a short note to explain the decision."
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={loading === "reject"}
              onClick={() => void run("reject", { note })}
            >
              Reject resignation
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "schedule"}
        onClose={() => setDialog(null)}
        title="Change last working day"
        description="This updates the exit checklist end date and notifies the employee."
      >
        <div className="space-y-4">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              loading={loading === "schedule"}
              onClick={() => void run("schedule", { lastWorkingDay: day })}
            >
              Save date
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "withdraw"}
        onClose={() => setDialog(null)}
        title="Withdraw resignation"
        description="This cancels your resignation request. Your manager and HR will be notified."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Keep resignation
          </Button>
          <Button
            variant="danger"
            loading={loading === "withdraw"}
            onClick={() => void run("withdraw")}
          >
            Withdraw
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "complete"}
        onClose={() => setDialog(null)}
        title="Complete resignation"
        description="This marks the exit complete and deactivates the employee account."
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The employee will no longer be able to sign in. Their offboarding checklist stays
            available in the offboarding module.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={loading === "complete"}
              onClick={() => void run("complete")}
            >
              Complete exit
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
