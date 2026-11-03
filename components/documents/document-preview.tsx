"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import * as XLSX from "xlsx";
import { Button, Card } from "@/components/ui";
import { readApiError } from "@/lib/toast";

async function readZipEntry(buffer: ArrayBuffer, fileName: string): Promise<string | null> {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const min = Math.max(0, buffer.byteLength - 65_557);
  let end = -1;
  for (let offset = buffer.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) return null;
  const entries = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) return null;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    if (name === fileName) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
      let bytes: Uint8Array;
      if (method === 0) bytes = compressed;
      else if (method === 8) {
        const format = "deflate-raw" as CompressionFormat;
        const compressedBuffer = compressed.slice().buffer as ArrayBuffer;
        const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream(format));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      } else return null;
      return decoder.decode(bytes);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function xmlText(xml: string, tag: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  return [...document.getElementsByTagName(tag)].map((node) => node.textContent ?? "");
}

export function DocumentPreview({ documentId, fileName, mimeType, protectedFile }: {
  documentId: string;
  fileName: string;
  mimeType: string | null;
  protectedFile: boolean;
}) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [spreadsheet, setSpreadsheet] = useState<string[][]>([]);
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [slides, setSlides] = useState<string[][] | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(0);
  const pdfPageRef = useRef(0);
  const [hasNextPdfPage, setHasNextPdfPage] = useState(true);
  const objectUrl = useMemo(() => blob ? URL.createObjectURL(blob) : null, [blob]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const load = useCallback(async (pin?: string, requestedPdfPage?: number) => {
    setLoading(true);
    setError("");
    try {
      const previewQuery = requestedPdfPage ? `?previewPage=${requestedPdfPage}` : "?inline=1";
      const response = pin === undefined
        ? await fetch(`/api/documents/${documentId}/file${previewQuery}`, { cache: "no-store" })
        : await fetch(`/api/documents/${documentId}/file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin, ...(requestedPdfPage ? { previewPage: requestedPdfPage } : {}) }),
          });
      if (!response.ok) {
        if (requestedPdfPage && requestedPdfPage > pdfPageRef.current) {
          setHasNextPdfPage(false);
          setError("You have reached the last page.");
        } else setError(await readApiError(response, "Could not open this document."));
        return;
      }
      const nextBlob = await response.blob();
      setBlob(nextBlob);
      setSpreadsheet([]);
      setParagraphs(null);
      setSlides(null);
      setText(null);
      if (requestedPdfPage) { pdfPageRef.current = requestedPdfPage; setPdfPage(requestedPdfPage); setHasNextPdfPage(true); }
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
      const type = mimeType?.toLowerCase() ?? nextBlob.type.toLowerCase();
      if (["xls", "xlsx", "csv"].includes(extension) || type.includes("spreadsheet") || type.includes("excel") || type === "text/csv") {
        const workbook = XLSX.read(await nextBlob.arrayBuffer(), { type: "array", cellDates: true });
        const first = workbook.SheetNames[0];
        const rows = first ? XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[first], { header: 1, defval: "" }) : [];
        setSpreadsheet(rows.map((row) => row.map((cell) => cell instanceof Date ? cell.toLocaleDateString() : String(cell ?? ""))));
      } else if (extension === "docx") {
        const xml = await readZipEntry(await nextBlob.arrayBuffer(), "word/document.xml");
        if (!xml) throw new Error("This Word file could not be previewed.");
        const parsed = new DOMParser().parseFromString(xml, "application/xml");
        setParagraphs([...parsed.getElementsByTagName("w:p")].map((p) => [...p.getElementsByTagName("w:t")].map((part) => part.textContent ?? "").join("")));
      } else if (extension === "pptx") {
        const buffer = await nextBlob.arrayBuffer();
        const found: string[][] = [];
        for (let slide = 1; slide <= 100; slide += 1) {
          const xml = await readZipEntry(buffer, `ppt/slides/slide${slide}.xml`);
          if (!xml) break;
          found.push(xmlText(xml, "a:t"));
        }
        if (!found.length) throw new Error("This PowerPoint file could not be previewed.");
        setSlides(found);
      } else if (type.startsWith("text/") || type.includes("json") || ["txt", "rtf", "md", "xml", "html"].includes(extension)) {
        const source = await nextBlob.text();
        setText(extension === "rtf" ? source.replace(/\\'[0-9a-f]{2}/gi, "�").replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "") : source);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not preview this document.");
    } finally {
      setLoading(false);
    }
  }, [documentId, fileName, mimeType]);

  const isPdf = mimeType?.toLowerCase() === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  useEffect(() => { if (!protectedFile) void load(undefined, isPdf ? 1 : undefined); }, [load, isPdf, protectedFile]);

  async function openProtected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 4) { setError("Enter the document PIN or password."); return; }
    await load(password, isPdf ? 1 : undefined);
  }

  async function downloadOriginal() {
    setLoading(true);
    setError("");
    try {
      const response = protectedFile
        ? await fetch(`/api/documents/${documentId}/file`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: password }) })
        : await fetch(`/api/documents/${documentId}/file`, { cache: "no-store" });
      if (!response.ok) { setError(await readApiError(response, "Could not download this document.")); return; }
      const url = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download this document.");
    } finally {
      setLoading(false);
    }
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const type = mimeType?.toLowerCase() ?? blob?.type.toLowerCase() ?? "";
  const download = <button type="button" onClick={() => void downloadOriginal()} disabled={loading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Download original</button>;

  if (!blob && protectedFile) return <Card className="p-6"><form onSubmit={openProtected} className="mx-auto max-w-sm space-y-3"><p className="text-sm text-gray-600">Enter the document PIN or password to preview this protected file.</p><input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /><Button loading={loading}>Open preview</Button>{error && <p className="text-sm text-red-600">{error}</p>}</form></Card>;
  if (!blob) return <Card className="p-6 text-sm text-gray-500">{loading ? "Loading preview…" : error || "Loading preview…"}</Card>;

  if (isPdf) return <div className="space-y-3"><div className="flex items-center justify-between">{download}<div className="flex items-center gap-2"><button type="button" disabled={pdfPage <= 1 || loading} onClick={() => void load(protectedFile ? password : undefined, pdfPage - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-gray-600">Page {pdfPage}</span><button type="button" disabled={!hasNextPdfPage || loading} onClick={() => void load(protectedFile ? password : undefined, pdfPage + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Next</button></div></div>{error && <p className="text-sm text-gray-500">{error}</p>}<div className="flex max-h-[75vh] justify-center overflow-auto rounded-xl border border-gray-200 bg-gray-100 p-3"><img src={objectUrl ?? undefined} alt={`${fileName}, page ${pdfPage}`} className="h-auto max-w-full self-start bg-white shadow" /></div></div>;
  if (type.startsWith("image/")) return <div className="space-y-3">{download}<div className="flex min-h-96 items-center justify-center rounded-xl bg-gray-50 p-4"><img src={objectUrl ?? undefined} alt={fileName} className="max-h-[75vh] max-w-full object-contain" /></div></div>;
  if (type.startsWith("video/")) return <div className="space-y-3">{download}<video controls src={objectUrl ?? undefined} className="max-h-[75vh] w-full rounded-xl bg-black" /></div>;
  if (type.startsWith("audio/")) return <div className="space-y-3">{download}<audio controls src={objectUrl ?? undefined} className="w-full" /></div>;
  if (paragraphs) return <div className="space-y-3">{download}<Card className="max-h-[75vh] overflow-auto p-8"><article className="mx-auto max-w-3xl space-y-3 text-sm leading-7 text-gray-800">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph || " "}</p>)}</article></Card></div>;
  if (slides) return <div className="space-y-3">{download}<div className="max-h-[75vh] space-y-4 overflow-auto">{slides.map((items, index) => <Card key={index} className="mx-auto aspect-video max-w-4xl p-8"><p className="mb-4 text-xs uppercase text-gray-400">Slide {index + 1}</p><div className="space-y-3 text-lg font-medium text-gray-800">{items.map((item, itemIndex) => <p key={itemIndex}>{item}</p>)}</div></Card>)}</div></div>;
  if (spreadsheet.length) return <div className="space-y-3">{download}<Card className="max-h-[75vh] overflow-auto p-0"><table className="min-w-full border-collapse text-sm"><tbody>{spreadsheet.map((row, ri) => <tr key={ri} className="border-b border-gray-100">{row.map((cell, ci) => <td key={ci} className="whitespace-pre-wrap border-r border-gray-100 px-3 py-2 text-gray-800">{cell}</td>)}</tr>)}</tbody></table></Card></div>;
  if (text !== null) return <div className="space-y-3">{download}<Card className="max-h-[75vh] overflow-auto"><pre className="whitespace-pre-wrap break-words text-sm text-gray-800">{text}</pre></Card></div>;
  return <Card className="flex flex-wrap items-center justify-between gap-3 p-5"><p className="text-sm text-gray-600">{error || "This file format does not have an in-app preview. You can still download it."}</p>{download}</Card>;
}
