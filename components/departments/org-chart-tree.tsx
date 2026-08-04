"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import { cn } from "@/lib/utils";
import type { OrgChartNode } from "@/lib/org-chart-data";
import { roleLabel } from "@/lib/roles";

const CARD_WIDTH = 192;

function splitName(fullNameStr: string) {
  const parts = fullNameStr.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || parts[0] || "",
  };
}

function roleStyles(role: string) {
  if (role === "COMPANY_ADMIN") {
    return {
      accent: "from-violet-500 to-brand-600",
      ring: "ring-violet-200/80",
      badge: "bg-violet-100 text-violet-700",
      label: roleLabel(role as "COMPANY_ADMIN"),
    };
  }
  if (role === "HR") {
    return {
      accent: "from-fuchsia-400 to-pink-500",
      ring: "ring-fuchsia-200/80",
      badge: "bg-fuchsia-100 text-fuchsia-700",
      label: roleLabel(role as "HR"),
    };
  }
  if (role === "MANAGER") {
    return {
      accent: "from-sky-400 to-blue-500",
      ring: "ring-sky-200/80",
      badge: "bg-sky-100 text-sky-700",
      label: roleLabel(role as "MANAGER"),
    };
  }
  if (role === "SUPERVISOR") {
    return {
      accent: "from-amber-400 to-orange-500",
      ring: "ring-amber-200/80",
      badge: "bg-amber-100 text-amber-700",
      label: roleLabel(role as "SUPERVISOR"),
    };
  }
  return {
    accent: "from-gray-300 to-gray-400",
    ring: "ring-gray-200/80",
    badge: "bg-gray-100 text-gray-600",
    label: roleLabel((role === "EMPLOYEE" ? role : "EMPLOYEE") as "EMPLOYEE"),
  };
}

function OrgChartCard({
  node,
  reportCount,
}: {
  node: OrgChartNode;
  reportCount: number;
}) {
  const styles = roleStyles(node.role);
  const { firstName, lastName } = splitName(node.name);

  return (
    <Link
      href={node.href}
      style={{ width: CARD_WIDTH }}
      className={cn(
        "group relative block rounded-2xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
        "hover:border-brand-200 hover:shadow-[0_8px_24px_rgba(123,97,255,0.12)] transition-all duration-200 ring-2 overflow-hidden",
        styles.ring
      )}
    >
      <div className={cn("h-1.5 w-full bg-gradient-to-r", styles.accent)} />
      <div className="px-4 py-3.5">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar firstName={firstName} lastName={lastName} src={node.avatar} size="md" />
            {reportCount > 0 && (
              <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold shadow-sm">
                <Users className="w-2.5 h-2.5" />
                {reportCount}
              </span>
            )}
          </div>
          <p className="mt-2.5 text-sm font-semibold text-gray-900 truncate w-full group-hover:text-brand-600">
            {node.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate w-full mt-0.5">{node.jobTitle}</p>
          <p className="text-[10px] text-gray-400 truncate w-full mt-0.5">{node.departmentName}</p>
          <span
            className={cn(
              "mt-2.5 inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold",
              styles.badge
            )}
          >
            {styles.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Renders branch content only — never an `<li>` (avoids invalid nested lists). */
function OrgChartBranch({ node }: { node: OrgChartNode }) {
  const hasChildren = node.children.length > 0;
  const stemOffset = CARD_WIDTH / 2;

  return (
    <div className="flex flex-col items-center">
      <OrgChartCard node={node} reportCount={node.children.length} />

      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          <div className="w-px h-6 bg-gradient-to-b from-brand-200 to-brand-300" aria-hidden />

          <div className="relative w-full">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-brand-200"
                style={{
                  left: stemOffset,
                  right: stemOffset,
                }}
                aria-hidden
              />
            )}

            <ul
              className="relative flex flex-nowrap justify-center gap-8 pt-6 m-0 p-0 list-none"
              style={{ minWidth: "max-content" }}
            >
              {node.children.map((child) => (
                <li key={child.id} className="flex flex-col items-center relative list-none">
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-brand-200"
                    aria-hidden
                  />
                  <div className="pt-6">
                    <OrgChartBranch node={child} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChartTree({
  nodes,
  emptyMessage = "No reporting structure to display.",
}: {
  nodes: OrgChartNode[];
  emptyMessage?: string;
}) {
  const scroll = useAutoHideScrollbar();

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No org structure yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div
      ref={scroll.ref as React.Ref<HTMLDivElement>}
      className={cn(
        "w-full overflow-x-auto overflow-y-visible py-8 px-6 -mx-2",
        scroll.className
      )}
    >
      <ul className="inline-flex min-w-max justify-center gap-14 mx-auto list-none m-0 p-0">
        {nodes.map((node) => (
          <li key={node.id} className="list-none">
            <OrgChartBranch node={node} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrgChartLegend() {
  const items = [
    { label: "Admin", className: "bg-violet-100 text-violet-700" },
    { label: "Manager", className: "bg-sky-100 text-sky-700" },
    { label: "Employee", className: "bg-gray-100 text-gray-600" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
      <span className="font-medium text-gray-400 uppercase tracking-wide">Roles</span>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn("px-2 py-0.5 rounded-full font-semibold", item.className)}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
