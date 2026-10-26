"use client";

import { RefreshCw } from "lucide-react";

export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 rounded-xl bg-[#8B94F6] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7a83e8]"
    >
      <RefreshCw className="h-4 w-4" />
      Try again
    </button>
  );
}
