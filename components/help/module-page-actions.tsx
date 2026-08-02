import { CalendarLink } from "@/components/holidays/calendar-link";
import { HelpLink } from "@/components/help/help-link";

export function ModulePageActions({
  helpSlug,
  helpLabel,
  showCalendar = false,
  calendarDate,
  calendarLabel,
}: {
  helpSlug: string;
  helpLabel?: string;
  showCalendar?: boolean;
  calendarDate?: string;
  calendarLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <HelpLink slug={helpSlug} label={helpLabel ?? "Help guide"} />
      {showCalendar && <CalendarLink date={calendarDate} label={calendarLabel} />}
    </div>
  );
}
