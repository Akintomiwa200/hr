"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyPageLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={() => void copyPageLink()} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-600 transition hover:bg-violet-50 hover:text-violet-700">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Copy page link"}
    </button>
  );
}
