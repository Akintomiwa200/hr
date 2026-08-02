import Link from "next/link";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function calendarHref(date?: string) {
  return date ? `/holidays?date=${date}` : "/holidays";
}

export function CalendarLink({
  date,
  className,
  label = "View in calendar",
}: {
  date?: string;
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href={calendarHref(date)}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors",
        className
      )}
    >
      <Calendar className="w-4 h-4" />
      {label}
    </Link>
  );
}
