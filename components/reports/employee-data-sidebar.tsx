"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Cake, PieChart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/reports/employee-data/age": UserRound,
  "/reports/employee-data/gender": PieChart,
  "/reports/employee-data/birthday": Cake,
  "/reports/employee-data/tenure": Briefcase,
};

export function EmployeeDataSidebar({
  tabs,
}: {
  tabs: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <nav className="rounded-xl border border-gray-200 bg-white p-2 space-y-0.5">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = TAB_ICONS[tab.href] ?? UserRound;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
