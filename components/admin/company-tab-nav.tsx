"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", segment: "", icon: Building2 },
  { label: "Users", segment: "/users", icon: Users },
  { label: "Employees", segment: "/employees", icon: UserRound },
  { label: "Billing", segment: "/billing", icon: CreditCard },
  { label: "Activity", segment: "/activity", icon: ScrollText },
];

export function CompanyTabNav({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/admin/companies/${companyId}`;

  return (
    <div className="overflow-x-auto border-b border-gray-100">
      <nav className="flex min-w-max gap-1 pb-px">
        {tabs.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = pathname === href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-[#7B61FF] text-[#7B61FF]"
                  : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
