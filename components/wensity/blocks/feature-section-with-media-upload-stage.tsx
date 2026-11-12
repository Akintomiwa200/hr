"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileImage, FileSpreadsheet, FileText, FolderOpen, Upload, X } from "lucide-react";

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function FeatureSectionWithMediaUploadStage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    setFiles(Array.from(incoming).slice(0, 5));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <section className="overflow-hidden px-6 py-16 text-gray-950 sm:px-8 lg:px-12 lg:py-20" aria-labelledby="media-stage-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B51EF]">People documents</p>
          <h2 id="media-stage-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Keep important HR files in one place</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">Employee records, onboarding documents, and supporting files stay organized with your people workflows.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6b51ef]">Open Smart HR <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link href="/documentation" className="rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 transition hover:border-violet-400 hover:text-violet-700">Learn more</Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-[26px] border border-violet-100 bg-white p-4 shadow-[0_16px_48px_rgba(61,43,130,0.10)] sm:p-6">
          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-6 text-center transition ${dragging ? "border-violet-400 bg-violet-50 text-gray-900" : "border-gray-300 bg-gray-50 text-gray-900"}`}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" className="hidden" onChange={handleFileChange} />
            <div className="flex items-center gap-2 text-gray-400"><FileText className="h-7 w-7 -rotate-6" /><FileImage className="h-8 w-8" /><FileSpreadsheet className="h-7 w-7 rotate-6" /></div>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7B61FF] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6b51ef]"><Upload className="h-3.5 w-3.5" /> Choose files</button>
            <p className="mt-2 text-xs text-gray-500">or drop files here</p>
            <p className="mt-1 text-[10px] text-gray-400">PDF, Word, Excel, CSV, PNG or JPG · up to 5 files for preview</p>
          </div>

          {files.length > 0 && <div className="mt-3 space-y-2" aria-live="polite">{files.map((file) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-gray-800"><FileText className="h-4 w-4 shrink-0 text-violet-600" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{file.name}</span><span className="text-[10px] text-gray-500">{formatSize(file.size)}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button></div>)}</div>}
          <p className="mt-3 text-center text-[10px] text-gray-500">Interactive preview only. Sign in to manage company documents.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, title: "Employee documents", description: "Keep relevant files with employee records and document folders." },
            { icon: Check, title: "Onboarding checklists", description: "Track required documents alongside each new hire’s onboarding tasks." },
            { icon: FolderOpen, title: "Role-aware access", description: "Use document visibility and sharing controls to manage who can view records." },
          ].map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-4 w-4" /></span><h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3><p className="mt-2 text-xs leading-5 text-gray-600">{description}</p></article>)}
        </div>
      </div>
    </section>
  );
}
