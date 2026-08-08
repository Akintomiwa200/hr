"use client";

import { useSearchParams } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

export function ReportsDownloadButton({
  exportSlug,
  label = "Download Data",
}: {
  exportSlug: string;
  label?: string;
}) {
  const params = useSearchParams();

  return (
    <Button
      className="bg-gray-900 text-white hover:bg-gray-800 border-0"
      size="sm"
      onClick={() => {
        const q = params.toString();
        window.location.href = `/api/reports/export?report=${exportSlug}${q ? `&${q}` : ""}`;
      }}
    >
      <FileDown className="w-4 h-4" />
      {label}
    </Button>
  );
}
