"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ClipboardList,
  Plus,
  Send,
  Trash2,
  PenLine,
  Search,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, statusBadge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import {
  FORM_CATEGORIES,
  LETTER_CATEGORIES,
  categoryLabel,
  parseFieldsJson,
  type PortalKind,
} from "@/lib/letters/fields";
import { STARTER_TEMPLATES } from "@/lib/letters/starters";

export type TemplateRow = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdByName: string;
  updatedAt: string;
  documentCount: number;
  fieldsJson: string;
};

export type DocumentRow = {
  id: string;
  kind: string;
  title: string;
  status: string;
  issuedByName: string | null;
  issuedAt: string | null;
  createdAt: string;
  employeeName: string;
};

export type EmployeeOption = {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export function LettersModule({
  templates: initialTemplates,
  documents: initialDocuments,
  employees,
  canManage,
}: {
  templates: TemplateRow[];
  documents: DocumentRow[];
  employees: EmployeeOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["letter_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const [tab, setTab] = useState<"LETTER" | "FORM" | "ISSUED">("LETTER");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<PortalKind>("LETTER");
  const [blankTitle, setBlankTitle] = useState("");
  const [blankCategory, setBlankCategory] = useState("CUSTOM");
  const [loading, setLoading] = useState(false);
  const [issueFor, setIssueFor] = useState<TemplateRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [issueExtras, setIssueExtras] = useState<Record<string, string>>({});
  const [deleteFor, setDeleteFor] = useState<TemplateRow | null>(null);

  const templates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialTemplates.filter((t) => {
      if (tab !== "ISSUED" && t.kind !== tab) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [initialTemplates, tab, query]);

  const documents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialDocuments.filter((d) => {
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.employeeName.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    });
  }, [initialDocuments, query]);

  const starters = STARTER_TEMPLATES.filter((s) => s.kind === createKind);
  const categories = createKind === "FORM" ? FORM_CATEGORIES : LETTER_CATEGORIES;

  const createFromStarter = async (starterId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/letters/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starterId }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create template"));
        return;
      }
      const created = await res.json();
      notify.success("Template added — you can edit it now");
      setCreateOpen(false);
      router.push(`/letters/${created.id}`);
    } finally {
      setLoading(false);
    }
  };

  const createBlank = async () => {
    if (!blankTitle.trim()) {
      notify.error("Give the template a title");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/letters/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: createKind,
          category: blankCategory,
          title: blankTitle.trim(),
          body: createKind === "LETTER" ? "{{today}}\n\nDear {{firstName}},\n\n" : "",
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create template"));
        return;
      }
      const created = await res.json();
      notify.success("Template created");
      setCreateOpen(false);
      setBlankTitle("");
      router.push(`/letters/${created.id}`);
    } finally {
      setLoading(false);
    }
  };

  const issue = async () => {
    if (!issueFor || selectedIds.length === 0) {
      notify.error("Select at least one person");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/letters/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: issueFor.id,
          employeeIds: selectedIds,
          extras: issueExtras,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to issue"));
        return;
      }
      const result = await res.json();
      notify.success(
        issueFor.kind === "FORM"
          ? `Form sent to ${result.created} ${result.created === 1 ? "person" : "people"}`
          : `Letter issued to ${result.created} ${result.created === 1 ? "person" : "people"}`
      );
      setIssueFor(null);
      setSelectedIds([]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteFor) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/letters/templates/${deleteFor.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete"));
        return;
      }
      notify.success("Template deleted");
      setDeleteFor(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(
            [
              ["LETTER", "Letters"],
              ["FORM", "Forms"],
              ["ISSUED", "Issued"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                tab === id ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputClass} pl-9 w-56 py-2`}
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setCreateKind(tab === "FORM" ? "FORM" : "LETTER");
                setBlankCategory("CUSTOM");
                setCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              New {tab === "FORM" ? "form" : "letter"}
            </Button>
          )}
        </div>
      </div>

      {tab === "ISSUED" ? (
        documents.length === 0 ? (
          <Card>
            <EmptyState
              icon={Send}
              title="Nothing issued yet"
              description="Issue a letter or assign a form to employees. They will get a notification in the portal."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/letters/documents/${doc.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.employeeName}
                      {doc.issuedAt ? ` · ${formatDate(doc.issuedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.kind === "FORM" ? "info" : "neutral"}>
                      {doc.kind === "FORM" ? "Form" : "Letter"}
                    </Badge>
                    {statusBadge(doc.status)}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === "FORM" ? ClipboardList : FileText}
            title={tab === "FORM" ? "No forms yet" : "No letters yet"}
            description="Create one in the portal from a starter template or a blank page. Changes show up live for HR and Admin."
            action={
              canManage ? (
                <Button
                  onClick={() => {
                    setCreateKind(tab);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Create {tab === "FORM" ? "form" : "letter"}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  {tpl.kind === "FORM" ? (
                    <ClipboardList className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                {statusBadge(tpl.isPublished ? "PUBLISHED" : "DRAFT")}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mt-3">{tpl.title}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {tpl.description || categoryLabel(tpl.kind, tpl.category)}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {tpl.documentCount} issued · Updated {formatDate(tpl.updatedAt)}
              </p>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                <Link href={`/letters/${tpl.id}`}>
                  <Button size="sm" variant="secondary">
                    <PenLine className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </Link>
                {canManage && tpl.isPublished && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIssueFor(tpl);
                      setSelectedIds([]);
                      setEmployeeQuery("");
                      setIssueExtras({});
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {tpl.kind === "FORM" ? "Assign" : "Issue"}
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteFor(tpl)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createKind === "FORM" ? "New form" : "New letter"}
        description="Create it in the portal. Starters include the usual HR letters and forms — you can edit every field."
        width="lg"
      >
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            {(["LETTER", "FORM"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setCreateKind(k);
                  setBlankCategory("CUSTOM");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  createKind === k ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {k === "FORM" ? "Form" : "Letter"}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Start from a template</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {starters.map((s) => (
                <button
                  key={`${s.kind}:${s.category}`}
                  type="button"
                  disabled={loading}
                  onClick={() => createFromStarter(`${s.kind}:${s.category}`)}
                  className="text-left rounded-xl border border-gray-200 p-3 hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Or start blank</p>
            <select
              className={inputClass}
              value={blankCategory}
              onChange={(e) => setBlankCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Title"
              value={blankTitle}
              onChange={(e) => setBlankTitle(e.target.value)}
            />
            <Button loading={loading} onClick={createBlank}>
              Create blank
            </Button>
          </div>
        </div>
      </Sheet>

      <Dialog
        open={Boolean(issueFor)}
        onClose={() => setIssueFor(null)}
        title={issueFor?.kind === "FORM" ? "Assign form" : "Issue letter"}
        description={issueFor ? `Send “${issueFor.title}” to selected people in real time.` : undefined}
        size="lg"
      >
        <div className="px-6 pb-6 space-y-4">
          {parseFieldsJson(issueFor?.fieldsJson).map((field) => (
            <div key={field.id}>
              <label className="text-xs font-medium text-gray-500">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  className={`${inputClass} mt-1`}
                  rows={3}
                  value={issueExtras[field.id] ?? ""}
                  onChange={(e) => setIssueExtras((v) => ({ ...v, [field.id]: e.target.value }))}
                />
              ) : (
                <input
                  className={`${inputClass} mt-1`}
                  type={field.type === "date" ? "date" : "text"}
                  value={issueExtras[field.id] ?? ""}
                  onChange={(e) => setIssueExtras((v) => ({ ...v, [field.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <input
            className={inputClass}
            placeholder="Search employees"
            value={employeeQuery}
            onChange={(e) => setEmployeeQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
            {filteredEmployees.map((emp) => {
              const checked = selectedIds.includes(emp.id);
              return (
                <label key={emp.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedIds((ids) =>
                        checked ? ids.filter((id) => id !== emp.id) : [...ids, emp.id]
                      )
                    }
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                    <span className="text-xs text-gray-500 block">
                      {emp.jobTitle} · {emp.department}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIssueFor(null)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={issue}>
              <Send className="w-4 h-4" />
              Send to {selectedIds.length || "…"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteFor)}
        onClose={() => setDeleteFor(null)}
        title="Delete template"
        description={deleteFor ? `Remove “${deleteFor.title}”? Issued copies stay in history.` : undefined}
      >
        <div className="px-6 pb-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteFor(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
