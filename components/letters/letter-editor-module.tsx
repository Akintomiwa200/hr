"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Send, Trash2 } from "lucide-react";
import { Badge, Button, Card, statusBadge } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { notify, readApiError } from "@/lib/toast";
import {
  FORM_CATEGORIES,
  LETTER_CATEGORIES,
  MERGE_FIELDS,
  newFieldId,
  parseFieldsJson,
  type FormFieldDef,
  type FormFieldType,
} from "@/lib/letters/fields";
import { buildMergeValues, renderLetterBody } from "@/lib/letters/render";
import { defaultIssueExtras } from "@/lib/letters/issue-defaults";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export type EditorTemplate = {
  id: string;
  kind: string;
  category: string;
  title: string;
  description: string | null;
  body: string;
  fieldsJson: string;
  isPublished: boolean;
};

export type EmployeeOption = {
  id: string;
  name: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  address: string | null;
  salary: number;
};

type EmployeeOverride = { jobTitle: string; address: string; salary: string };

export function LetterEditorModule({
  template: initial,
  employees,
  companyName,
  companyLogo,
}: {
  template: EditorTemplate;
  employees: EmployeeOption[];
  companyName: string;
  companyLogo: string | null;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["letter_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description ?? "",
    kind: initial.kind,
    category: initial.category,
    body: initial.body,
    isPublished: initial.isPublished,
  });
  const [fields, setFields] = useState<FormFieldDef[]>(parseFieldsJson(initial.fieldsJson));
  const [loading, setLoading] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [employeeOverrides, setEmployeeOverrides] = useState<Record<string, EmployeeOverride>>({});
  const [employeeQuery, setEmployeeQuery] = useState("");

  const categories = form.kind === "FORM" ? FORM_CATEGORIES : LETTER_CATEGORIES;
  const preview = useMemo(
    () =>
      renderLetterBody(
        form.body,
        buildMergeValues({
          companyName,
          extras,
          employee: {
            firstName: "Ada",
            lastName: "Okeke",
            employeeCode: "EMP-001",
            jobTitle: "People Partner",
            email: "ada@company.com",
            phone: "0800 000 0000",
            hireDate: new Date(),
            salary: 0,
            address: "Lagos",
            employmentType: "FULL_TIME",
            department: { name: "Human Resources" },
            branch: { name: "Head Office" },
            manager: { firstName: "Tunde", lastName: "Bello" },
          },
        })
      ),
    [form.body, companyName, extras]
  );

  const insertToken = (key: string) => {
    setForm((f) => ({ ...f, body: `${f.body}{{${key}}}` }));
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/letters/templates/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fields }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save"));
        return;
      }
      notify.success("Saved — live for HR and Admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const issue = async () => {
    if (selectedIds.length === 0) {
      notify.error("Select at least one person");
      return;
    }
    const missing = fields.find((field) => field.required && !extras[field.id]?.trim());
    if (missing) {
      notify.error(`Complete ${missing.label} before issuing`);
      return;
    }
    setLoading(true);
    try {
      const saveRes = await fetch(`/api/letters/templates/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fields, isPublished: true }),
      });
      if (!saveRes.ok) {
        notify.error(await readApiError(saveRes, "Save failed"));
        return;
      }
      const res = await fetch("/api/letters/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: initial.id,
          employeeIds: selectedIds,
          extras,
          employeeOverrides,
        }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to issue"));
        return;
      }
      const result = await res.json();
      notify.success(`Sent to ${result.created}`);
      setIssueOpen(false);
      setForm((f) => ({ ...f, isPublished: true }));
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/letters" className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Letters & forms
        </Link>
        <div className="flex flex-wrap gap-2">
          {statusBadge(form.isPublished ? "PUBLISHED" : "DRAFT")}
          <Button variant="secondary" loading={loading} onClick={save}>
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button
            onClick={() => {
              setIssueOpen(true);
              setSelectedIds([]);
              setExtras(defaultIssueExtras(form.category));
              setEmployeeOverrides({});
            }}
          >
            <Send className="w-4 h-4" />
            {form.kind === "FORM" ? "Assign" : "Issue"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={inputClass}
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value,
                  category: "CUSTOM",
                }))
              }
            >
              <option value="LETTER">Letter</option>
              <option value="FORM">Form</option>
            </select>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title"
          />
          <input
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            Published (can be issued)
          </label>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Merge fields</p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_FIELDS.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => insertToken(field.key)}
                  className="text-[11px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100"
                >
                  {`{{${field.key}}}`}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className={`${inputClass} min-h-[280px] font-mono text-[13px]`}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Letter or form intro…"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Extra fields</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setFields((list) => [
                    ...list,
                    { id: newFieldId(), label: "New field", type: "text" },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" />
                Field
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <input
                    className={inputClass}
                    value={field.label}
                    onChange={(e) =>
                      setFields((list) =>
                        list.map((f, i) => (i === index ? { ...f, label: e.target.value } : f))
                      )
                    }
                  />
                  <select
                    className={inputClass}
                    value={field.type}
                    onChange={(e) =>
                      setFields((list) =>
                        list.map((f, i) =>
                          i === index ? { ...f, type: e.target.value as FormFieldType } : f
                        )
                      )
                    }
                  >
                    {["text", "textarea", "date", "number", "select", "checkbox"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFields((list) => list.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Live preview</h3>
            <Badge variant="info">Sample employee</Badge>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-6 min-h-[360px]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4 mb-5">
              <p className="text-sm font-semibold text-gray-900">{companyName}</p>
              {companyLogo ? (
                <img src={companyLogo} alt={`${companyName} logo`} className="h-10 max-w-28 object-contain object-right" />
              ) : null}
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-4">{form.title || "Untitled"}</p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {preview || "Start typing to preview."}
            </pre>
            {fields.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
                {fields.map((field) => (
                  <div key={field.id}>
                    <label className="text-xs font-medium text-gray-500">{field.label}</label>
                    {field.type === "textarea" ? (
                      <textarea className={`${inputClass} mt-1`} rows={3} disabled />
                    ) : (
                      <input className={`${inputClass} mt-1`} type={field.type === "date" ? "date" : "text"} disabled />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Sheet
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={form.kind === "FORM" ? "Assign form" : "Issue letter"}
        description="Employee information is filled from the HR record. Complete only the letter-specific terms below."
        width="lg"
      >
        <div className="px-6 pb-6 space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="text-xs font-medium text-gray-500">
                {field.label}{field.required ? " *" : ""}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  className={`${inputClass} mt-1`}
                  rows={3}
                  value={extras[field.id] ?? ""}
                  onChange={(e) => setExtras((v) => ({ ...v, [field.id]: e.target.value }))}
                />
              ) : field.type === "select" ? (
                <select
                  className={`${inputClass} mt-1`}
                  value={extras[field.id] ?? ""}
                  onChange={(e) => setExtras((v) => ({ ...v, [field.id]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={extras[field.id] === "true"}
                    onChange={(e) => setExtras((v) => ({ ...v, [field.id]: e.target.checked ? "true" : "" }))}
                  />
                  Yes
                </label>
              ) : (
                <input
                  className={`${inputClass} mt-1`}
                  type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                  value={extras[field.id] ?? ""}
                  onChange={(e) => setExtras((v) => ({ ...v, [field.id]: e.target.value }))}
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
          <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-xl">
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
                  <span className="text-sm">
                    {emp.name}
                    <span className="text-xs text-gray-500 block">
                      {emp.employeeCode} · {emp.jobTitle} · {emp.department}
                    </span>
                    <span className="text-xs text-gray-400 block">
                      {emp.address || "Address missing"} · Salary: {emp.salary > 0 ? emp.salary.toLocaleString() : "missing"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {form.kind === "LETTER" && selectedIds.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Recipient details</p>
                <p className="text-xs text-gray-500 mt-1">Add or correct these details here. They will be saved to the employee profile and used in this letter.</p>
              </div>
              {selectedIds.map((id) => {
                const employee = employees.find((emp) => emp.id === id);
                if (!employee) return null;
                const override = employeeOverrides[id];
                return (
                  <div key={id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                    <input
                      className={inputClass}
                      placeholder="Job title / role"
                      value={override?.jobTitle ?? employee.jobTitle}
                      onChange={(e) => setEmployeeOverrides((current) => ({
                        ...current,
                        [id]: { jobTitle: e.target.value, address: current[id]?.address ?? employee.address ?? "", salary: current[id]?.salary ?? String(employee.salary || "") },
                      }))}
                    />
                    <textarea
                      className={inputClass}
                      rows={2}
                      placeholder="Residential address"
                      value={override?.address ?? employee.address ?? ""}
                      onChange={(e) => setEmployeeOverrides((current) => ({
                        ...current,
                        [id]: { jobTitle: current[id]?.jobTitle ?? employee.jobTitle, address: e.target.value, salary: current[id]?.salary ?? String(employee.salary || "") },
                      }))}
                    />
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      placeholder="Monthly salary"
                      value={override?.salary ?? (employee.salary > 0 ? String(employee.salary) : "")}
                      onChange={(e) => setEmployeeOverrides((current) => ({
                        ...current,
                        [id]: { jobTitle: current[id]?.jobTitle ?? employee.jobTitle, address: current[id]?.address ?? employee.address ?? "", salary: e.target.value },
                      }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={issue}>
              Send
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
