"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  CalendarDays,
  ChevronDown,
  Eraser,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  countReportWords,
  toDateInputValue,
} from "@/lib/daily-reporting/content";
import { dailyReportTemplateLabel } from "@/lib/daily-reporting/templates";

export type DailyReportEditorData = {
  id: string;
  title: string;
  content: string;
  status: string;
  template: string;
  reportDate: string;
  updatedAt: string;
};

type Props = {
  report: DailyReportEditorData | null;
  initialTitle?: string;
  initialContent?: string;
  initialReportDate?: string;
  templateId?: string;
};

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-200/80 hover:text-gray-900"
    >
      {children}
    </button>
  );
}

export function DailyReportEditor({
  report,
  initialTitle = "",
  initialContent = "<p><br></p>",
  initialReportDate,
  templateId = "blank",
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(report?.title ?? initialTitle);
  const [status, setStatus] = useState(report?.status ?? "DRAFT");
  const [reportDate, setReportDate] = useState(
    report
      ? initialReportDate ?? toDateInputValue(report.reportDate)
      : initialReportDate ?? toDateInputValue(new Date())
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [wordCount, setWordCount] = useState(() =>
    countReportWords(report?.content ?? initialContent)
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setFormatOpen(false);
        setInsertOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const syncWordCount = () => {
    setWordCount(countReportWords(contentRef.current?.innerHTML ?? ""));
  };

  const run = (command: string, value?: string) => {
    contentRef.current?.focus();
    // Prefer semantic tags over inline styles so saved HTML survives sanitizing.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, value);
    setDirty(true);
    setFormatOpen(false);
    setInsertOpen(false);
    syncWordCount();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    if (!/^(https?:|mailto:|tel:|\/)/i.test(url.trim())) {
      notify.error("Use an http(s), mailto, tel, or relative link.");
      return;
    }
    document.execCommand("createLink", false, url.trim());
    setDirty(true);
    setInsertOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || "Untitled daily report",
        content: contentRef.current?.innerHTML ?? "",
        status,
        reportDate,
        template: report?.template ?? templateId,
      };

      const res = await fetch(report ? `/api/daily-reports/${report.id}` : "/api/daily-reports", {
        method: report ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        notify.error(await readApiError(res, "Could not save this report"));
        return;
      }

      const saved = (await res.json()) as { id: string };
      setDirty(false);
      notify.success(report ? "Report saved" : "Report created");

      if (!report) {
        router.replace(`/daily-reporting/${saved.id}`);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/daily-reports/${report.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Could not delete this report"));
        return;
      }
      notify.success("Report deleted");
      setDeleteOpen(false);
      router.replace("/daily-reporting");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/daily-reporting"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> All reports
        </Link>
        <span className="text-xs text-gray-400">
          {report ? `Last saved ${formatRelativeTime(report.updatedAt)}` : "New report"}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              Unsaved changes
            </span>
          )}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setDirty(true);
            }}
            aria-label="Report status"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
          {report && (
            <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> {report ? "Save report" : "Create report"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          ref={toolbarRef}
          className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/95 px-3 py-2 backdrop-blur"
        >
          <ToolbarButton label="Undo" onClick={() => run("undo")}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => run("redo")}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <div className="relative">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setFormatOpen((open) => !open);
                setInsertOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/80 hover:text-gray-900"
            >
              <Type className="h-3.5 w-3.5" /> Format
              <ChevronDown className={`h-3 w-3 transition-transform ${formatOpen ? "rotate-180" : ""}`} />
            </button>
            {formatOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("formatBlock", "<p>")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pilcrow className="h-4 w-4 text-gray-400" /> Normal text
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("formatBlock", "<h1>")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Heading1 className="h-4 w-4 text-gray-400" /> Heading 1
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("formatBlock", "<h2>")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Heading2 className="h-4 w-4 text-gray-400" /> Heading 2
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("formatBlock", "<blockquote>")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Quote className="h-4 w-4 text-gray-400" /> Quote
                </button>
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <ToolbarButton label="Bold" onClick={() => run("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => run("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => run("underline")}>
            <Underline className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" onClick={() => run("strikeThrough")}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <ToolbarButton label="Bulleted list" onClick={() => run("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => run("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Align left" onClick={() => run("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Align centre" onClick={() => run("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Align right" onClick={() => run("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-gray-200" />

          <ToolbarButton label="Insert link" onClick={insertLink}>
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Clear formatting" onClick={() => run("removeFormat")}>
            <Eraser className="h-4 w-4" />
          </ToolbarButton>

          <div className="relative">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setInsertOpen((open) => !open);
                setFormatOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200/80 hover:text-gray-900"
            >
              Insert
              <ChevronDown className={`h-3 w-3 transition-transform ${insertOpen ? "rotate-180" : ""}`} />
            </button>
            {insertOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("insertHTML", formatDate(new Date()))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CalendarDays className="h-4 w-4 text-gray-400" /> Today&apos;s date
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => run("insertHorizontalRule")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4 text-gray-400" /> Divider
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10 md:py-14">
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
            placeholder="Untitled daily report"
            aria-label="Report title"
            className="w-full border-none bg-transparent text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none md:text-4xl"
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
            <label className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <input
                type="date"
                value={reportDate}
                onChange={(event) => {
                  setReportDate(event.target.value);
                  setDirty(true);
                }}
                aria-label="Report date"
                className="rounded border border-transparent bg-transparent py-0.5 text-xs text-gray-500 focus:border-gray-200 focus:outline-none"
              />
            </label>
            <span>{dailyReportTemplateLabel(report?.template ?? templateId)}</span>
            <span>{wordCount} word{wordCount === 1 ? "" : "s"}</span>
            <Badge variant={status === "SUBMITTED" ? "success" : "neutral"}>
              {status === "SUBMITTED" ? "Submitted" : "Draft"}
            </Badge>
          </div>

          <div className="my-8 h-px bg-gray-100" />

          <div
            ref={contentRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Report content"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{
              __html: report?.content || initialContent || "<p><br></p>",
            }}
            onInput={() => {
              setDirty(true);
              syncWordCount();
            }}
            className="daily-report-content min-h-[55vh] text-[15px] leading-7 text-gray-800 outline-none"
          />
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete daily report"
        description="This permanently removes the report and its contents."
      >
        <p className="mb-4 text-sm text-gray-600">
          Delete <strong>{report?.title || "this report"}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={saving} onClick={remove}>
            <Trash2 className="h-4 w-4" /> Delete report
          </Button>
        </div>
      </Dialog>
    </>
  );
}
