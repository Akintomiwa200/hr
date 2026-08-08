"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, CalendarClock, Settings, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/recruitment", label: "Jobs", icon: Briefcase, match: (p: string) => p === "/recruitment" || (/^\/recruitment\/[^/]+$/.test(p) && !p.includes("candidates") && !p.includes("interviews") && !p.includes("settings")) },
  { href: "/recruitment/candidates", label: "Candidates", icon: UserSearch, match: (p: string) => p.startsWith("/recruitment/candidates") },
  { href: "/recruitment/interviews", label: "Interviews", icon: CalendarClock, match: (p: string) => p.startsWith("/recruitment/interviews") },
  { href: "/recruitment/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/recruitment/settings") },
];

export function RecruitmentTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100/80 rounded-xl w-fit">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
