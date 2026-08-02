import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  UserRound,
  Wallet,
} from "lucide-react";
import type { UpcomingCalendarEvent } from "@/lib/calendar-summary";

const kindStyles = {
  holiday: { icon: CalendarDays, bg: "bg-violet-100", color: "text-violet-600" },
  leave: { icon: UserRound, bg: "bg-sky-100", color: "text-sky-600" },
  payroll: { icon: Wallet, bg: "bg-emerald-100", color: "text-emerald-600" },
  interview: { icon: Briefcase, bg: "bg-orange-100", color: "text-orange-600" },
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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-900">Upcoming Schedule</h3>
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

      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No upcoming events in the next 30 days.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const style = kindStyles[event.kind];
            const Icon = style.icon;
            return (
              <Link
                key={event.id}
                href={event.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatEventDate(event.date)} · {event.time}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
