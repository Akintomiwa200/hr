"use client";

import { Bell, MessageSquare, Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui";

export function TopBar({
  firstName,
  lastName,
  pageTitle = "Dashboard",
  teamCount = 0,
}: {
  firstName: string;
  lastName: string;
  pageTitle?: string;
  teamCount?: number;
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#f8f9fc] px-8 pt-6 pb-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 shrink-0">{pageTitle}</h1>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative hidden lg:block flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Quick Search..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
            <MessageSquare className="w-[18px] h-[18px]" />
          </button>

          <button className="relative p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>

          <div className="hidden sm:flex items-center -space-x-2">
            {["A", "B", "C"].map((initial, i) => (
              <div
                key={initial}
                className="w-8 h-8 rounded-full bg-violet-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-violet-700"
                style={{ zIndex: 3 - i }}
              >
                {initial}
              </div>
            ))}
            {teamCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-white">
                +{teamCount}
              </div>
            )}
          </div>

          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
            <Plus className="w-4 h-4" />
            Invite
          </button>

          <Avatar firstName={firstName} lastName={lastName} size="sm" />
        </div>
      </div>
    </header>
  );
}
