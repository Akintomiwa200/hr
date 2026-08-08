"use client";

import { usePathname } from "next/navigation";
import { ReportsSubNav } from "@/components/reports/reports-data-table";

export function ReportsSubNavClient({
  tabs,
}: {
  tabs: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return <ReportsSubNav tabs={tabs} pathname={pathname} />;
}
