import Link from "next/link";
import {
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingCalendarEvent } from "@/lib/calendar-summary";

const kindStyles = {
  holiday: { icon: CalendarDays, bg: "bg-violet-50", color: "text-violet-600" },
  leave: { icon: UserRound, bg: "bg-sky-50", color: "text-sky-600" },
  payroll: { icon: Wallet, bg: "bg-emerald-50", color: "text-emerald-600" },
  interview: { icon: Briefcase, bg: "bg-orange-50", color: "text-orange-600" },
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function UpcomingScheduleWidget({ events }: { events: UpcomingCalendarEvent[] }) {
  return (
    <div className="rounded-2xl border border-gray-100/90 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-16px_rgba(16,24,40,0.14)]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-4">
        <h3 className="flex items-center gap-2.5 text-[13px] font-semibold text-gray-900">
          <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <CalendarCheck2 className="w-4 h-4 text-[#7B61FF]" />
          </span>
          Upcoming Schedule
        </h3>
        <div className="flex items-center gap-3">
          <Link href="/help/calendar" className="text-[11px] text-gray-500 hover:text-violet-600">
            Help
          </Link>
          <Link
            href="/holidays"
            className="text-[11px] text-[#7B61FF] font-medium flex items-center gap-0.5 hover:underline"
          >
            Open calendar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="p-4">
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No upcoming events in the next 30 days.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {events.map((event) => {
              const style = kindStyles[event.kind];
              const Icon = style.icon;
              return (
                <Link
                  key={event.id}
                  href={event.href}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-gray-100",
                    "hover:border-violet-200 hover:shadow-sm hover:-translate-y-px transition-all"
                  )}
                >
                  <span
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", style.bg)}
                  >
                    <Icon className={cn("w-4 h-4", style.color)} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-gray-900 truncate">
                      {event.title}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {formatEventDate(event.date)} · {event.time}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}