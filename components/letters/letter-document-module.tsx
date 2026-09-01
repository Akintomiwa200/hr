"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { Button, statusBadge } from "@/components/ui";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { parseFieldsJson, parseFieldValues, type FormFieldDef } from "@/lib/letters/fields";

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

export type IssuedDocument = {
  id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  fieldValuesJson: string;
  issuedByName: string | null;
  issuedAt: string | null;
  acknowledgedAt: string | null;
  employeeName: string;
  templateFieldsJson: string | null;
};

export function LetterDocumentModule({
  document: doc,
  canManage,
  isRecipient,
  companyName,
  companyLogo,
}: {
  document: IssuedDocument;
  canManage: boolean;
  isRecipient: boolean;
  companyName: string;
  companyLogo: string | null;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["letter_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const fields: FormFieldDef[] = parseFieldsJson(doc.templateFieldsJson ?? "[]");
  const [values, setValues] = useState<Record<string, string>>(parseFieldValues(doc.fieldValuesJson));
  const [loading, setLoading] = useState(false);
  const readOnly = doc.status === "SUBMITTED" || doc.status === "ACKNOWLEDGED" || doc.status === "CANCELLED";

  const submit = async (action: "submit" | "acknowledge" | "void") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/letters/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, values }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not update"));
        return;
      }
      notify.success(action === "submit" ? "Form submitted" : action === "void" ? "Cancelled" : "Acknowledged");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/letters" className="text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Letters & forms
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(doc.status)}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
          {isRecipient && doc.kind === "LETTER" && doc.status === "ISSUED" && (
            <Button loading={loading} onClick={() => submit("acknowledge")}>
              <Check className="w-4 h-4" />
              Acknowledge
            </Button>
          )}
          {isRecipient && doc.kind === "FORM" && doc.status === "PENDING" && (
            <Button loading={loading} onClick={() => submit("submit")}>
              Submit form
            </Button>
          )}
          {canManage && doc.status !== "CANCELLED" && (
            <Button variant="danger" loading={loading} onClick={() => submit("void")}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div id="letter-document" className="letter-document bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-3xl mx-auto print:shadow-none print:border-0">
        <header className="letterhead flex items-start justify-between gap-6 border-b border-gray-200 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-violet-600 font-semibold mb-2">
              {doc.kind === "FORM" ? "HR form" : "Official correspondence"}
            </p>
            <p className="font-semibold text-gray-900">{companyName}</p>
          </div>
          {companyLogo ? (
            <img src={companyLogo} alt={`${companyName} logo`} className="h-16 max-w-40 object-contain object-right" />
          ) : (
            <p className="text-right font-bold text-sm uppercase tracking-[0.16em] text-gray-800">{companyName}</p>
          )}
        </header>

        <main className="letter-content">
          <h1 className="text-2xl font-bold text-gray-900 mt-7">{doc.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {doc.employeeName}
            {doc.issuedAt ? ` · ${formatDate(doc.issuedAt)}` : ""}
            {doc.issuedByName ? ` · Issued by ${doc.issuedByName}` : ""}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed mt-6">
            {doc.body}
          </pre>
        {fields.length > 0 && (
          <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="text-xs font-medium text-gray-500">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className={`${inputClass} mt-1`}
                    rows={4}
                    disabled={readOnly || !isRecipient}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                ) : field.type === "select" ? (
                  <select
                    className={`${inputClass} mt-1`}
                    disabled={readOnly || !isRecipient}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 mt-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={readOnly || !isRecipient}
                      checked={values[field.id] === "true"}
                      onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.checked ? "true" : "" }))}
                    />
                    Yes
                  </label>
                ) : (
                  <input
                    className={`${inputClass} mt-1`}
                    type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                    disabled={readOnly || !isRecipient}
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        </main>

        <footer className="letter-footer border-t border-gray-200 mt-10 pt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-gray-500">
          <span>{companyName}</span>
          <span>{doc.kind === "FORM" ? "HR form" : "Employment letter"}</span>
        </footer>
      </div>
    </div>
  );
}
