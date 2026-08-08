"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { EMPLOYEE_GROUPS, parseShareTargets } from "@/lib/documents/share-groups";
import type { FolderRow } from "@/components/documents/documents-module";

const scopeOptions = [
  { id: "EVERYONE", label: "Everyone" },
  { id: "DEPARTMENT", label: "Department" },
  { id: "OFFICE", label: "Offices" },
  { id: "EMPLOYEE_GROUP", label: "Employee Group" },
] as const;

export function ShareFolderDialog({
  folder,
  departments,
  onClose,
  onSaved,
}: {
  folder: FolderRow;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [shareScope, setShareScope] = useState(folder.shareScope || "EVERYONE");
  const [targets, setTargets] = useState<string[]>(parseShareTargets(folder.shareTargets));
  const [loading, setLoading] = useState(false);

  const toggleTarget = (id: string) => {
    setTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const removeTarget = (id: string) => setTargets((prev) => prev.filter((t) => t !== id));

  const availableTargets =
    shareScope === "DEPARTMENT" || shareScope === "OFFICE"
      ? departments.map((d) => ({ id: d.id, label: d.name }))
      : shareScope === "EMPLOYEE_GROUP"
        ? EMPLOYEE_GROUPS.map((g) => ({ id: g.id, label: g.label }))
        : [];

  const targetLabel = (id: string) =>
    departments.find((d) => d.id === id)?.name ??
    EMPLOYEE_GROUPS.find((g) => g.id === id)?.label ??
    id;

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/document-folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareScope,
          shareTargets: shareScope === "EVERYONE" ? [] : targets,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update sharing"));
        return;
      }
      notify.success("Sharing updated");
      onSaved();
    } catch {
      notify.error("Failed to update sharing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Share With">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {scopeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setShareScope(opt.id);
                setTargets([]);
              }}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                shareScope === opt.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {shareScope !== "EVERYONE" && (
          <>
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {targets.map((id) => (
                <Badge key={id} variant="info" className="gap-1">
                  {targetLabel(id)}
                  <button type="button" onClick={() => removeTarget(id)} className="ml-1 text-brand-700">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-gray-100 p-2">
              {availableTargets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTarget(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    targets.includes(t.id) ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={save}>
            Share Now
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
