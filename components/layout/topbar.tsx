"use client";

import { Bell, MessageSquare, PanelLeft, Plus, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { getPageTitle } from "@/lib/dashboard-nav";
import type { Role } from "@prisma/client";

export function TopBar({
  firstName,
  lastName,
  role,
  teamCount = 0,
  onToggleSidebar,
  sidebarCollapsed,
  isMobile,
}: {
  firstName: string;
  lastName: string;
  role: Role;
  teamCount?: number;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getPageTitle(pathname, role);
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <header className="shrink-0 z-30 border-b border-brand-100/60 bg-surface/95 backdrop-blur-sm px-4 sm:px-5 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-brand-600 transition-colors shrink-0"
            aria-label={
              isMobile
                ? sidebarCollapsed
                  ? "Open menu"
                  : "Close menu"
                : sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className="w-px h-4 bg-brand-100 shrink-0" />
          <h1 className="text-[14px] font-medium text-gray-500 truncate">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <form onSubmit={handleQuickSearch} className="relative hidden lg:block flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Quick search..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
          </form>

          <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>

          <button className="relative p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-brand-50/50 hover:text-brand-600 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
          </button>

          <div className="hidden sm:flex items-center -space-x-1.5">
            {["A", "B", "C"].map((initial, i) => (
              <div
                key={initial}
                className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-brand-700"
                style={{ zIndex: 3 - i }}
              >
                {initial}
              </div>
            ))}
            {teamCount > 0 && (
              <div className="w-7 h-7 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-white">
                +{teamCount}
              </div>
            )}
          </div>

          <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20">
            <Plus className="w-3.5 h-3.5" />
            Invite
          </button>

          <Avatar firstName={firstName} lastName={lastName} size="sm" />
        </div>
      </div>
    </header>
  );
}
