"use client";

import Link from "next/link";
import { CalendarDays, Clock, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", href: (id: string) => `/employees/${id}`, icon: User },
  { id: "leave", label: "Leave", href: (id: string) => `/employees/${id}/leave`, icon: CalendarDays },
  { id: "attendance", label: "Attendance", href: (id: string) => `/employees/${id}/attendance`, icon: Clock },
  { id: "payroll", label: "Payroll", href: (id: string) => `/employees/${id}/payroll`, icon: Wallet },
] as const;

export function EmployeeTimeNav({
  employeeId,
  active,
}: {
  employeeId: string;
  active: "profile" | "leave" | "attendance" | "payroll";
}) {
  return (
    <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href(employeeId)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors",
              isActive
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
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
