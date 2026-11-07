"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Compass,
  FileBadge2,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Route,
  Sparkles,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { useRealtimeStatus } from "@/hooks/use-app-events";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof BookOpen };

const LEARN_ITEMS: NavItem[] = [
  { href: "/training", label: "Overview", icon: LayoutDashboard },
  { href: "/training/catalog", label: "Course catalog", icon: LibraryBig },
  { href: "/training/my-learning", label: "My learning", icon: GraduationCap },
  { href: "/training/paths", label: "Learning paths", icon: Route },
  { href: "/training/skills", label: "Skills", icon: Sparkles },
  { href: "/training/certifications", label: "Certifications", icon: FileBadge2 },
  { href: "/training/requests", label: "Training requests", icon: ClipboardCheck },
];

const MANAGE_ITEMS: NavItem[] = [
  { href: "/training/assignments", label: "Assignments", icon: UserRoundCheck },
  { href: "/training/creator", label: "Creator studio", icon: Wrench },
];

const CREATOR_ITEMS: NavItem[] = [
  { href: "/training/creator/courses", label: "Course manager", icon: BookOpen },
  { href: "/training/creator/paths", label: "Path builder", icon: Compass },
  { href: "/training/creator/analytics", label: "Analytics", icon: BarChart3 },
];

export function LearningWorkspaceNav({
  roleLabel,
  isCreator,
  isManager,
}: {
  roleLabel: string;
  isCreator: boolean;
  isManager: boolean;
}) {
  const pathname = usePathname();
  const [connected] = useLiveState();

  const active = (href: string) =>
    href === "/training" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="mb-6 space-y-2 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <GraduationCap className="h-4 w-4 text-violet-600" />
          Learning & Upskilling
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-violet-700">
            {roleLabel}
          </span>
          {isCreator && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-700">
              Creator mode
            </span>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            connected
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-emerald-500" : "bg-gray-400"
            )}
          />
          {connected ? "Live" : "Reconnecting"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {LEARN_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={active(item.href)} />
        ))}
      </div>

      {(isManager || isCreator) && (
        <div className="flex flex-wrap items-center gap-1 border-t border-gray-100 pt-2">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {isCreator ? "Create & manage" : "Manage team"}
          </span>
          {MANAGE_ITEMS.filter((item) => isCreator || item.href !== "/training/creator").map(
            (item) => (
              <NavLink key={item.href} item={item} active={active(item.href)} />
            )
          )}
          {isCreator &&
            CREATOR_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={active(item.href)} />
            ))}
        </div>
      )}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-violet-50 hover:text-violet-700"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </Link>
  );
}

function useLiveState() {
  const [connected, setConnected] = useState(false);
  useRealtimeStatus(setConnected);
  return [connected] as const;
}
