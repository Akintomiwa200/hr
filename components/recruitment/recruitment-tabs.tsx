"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/recruitment", label: "Jobs", match: (p: string) =>
      p === "/recruitment" ||
      (/^\/recruitment\/[^/]+$/.test(p) &&
        !p.startsWith("/recruitment/candidates") &&
        !p.startsWith("/recruitment/interviews")) },
  { href: "/recruitment/candidates", label: "Candidates", match: (p: string) =>
      p.startsWith("/recruitment/candidates") },
  { href: "/recruitment/interviews", label: "Interviews", match: (p: string) =>
      p === "/recruitment/interviews" },
];

export function RecruitmentTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Recruitment sections"
      className="flex flex-wrap gap-1 p-1 mb-6 bg-gray-100/80 rounded-xl w-fit"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
              active
                ? "bg-white text-violet-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
