import type { Role } from "@prisma/client";
import { getCalendarData } from "@/lib/calendar-data";

export type UpcomingCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: "holiday" | "leave" | "payroll" | "interview";
  href: string;
};

function parseDate(value: string) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${period}`;
}

export async function getUpcomingCalendarEvents(
  session: { role: Role; employeeId?: string; companyId?: string | null },
  limit = 5
): Promise<UpcomingCalendarEvent[]> {
  const data = await getCalendarData(session);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  const events: UpcomingCalendarEvent[] = [];

  for (const holiday of data.holidays) {
    const date = parseDate(holiday.date);
    if (date < today || date > horizon) continue;
    events.push({
      id: `holiday-${holiday.id}`,
      title: holiday.name,
      date: holiday.date,
      time: "All day",
      kind: "holiday",
      href: `/holidays?date=${holiday.date.slice(0, 10)}`,
    });
  }

  for (const leave of data.leaveRequests) {
    const start = parseDate(leave.startDate);
    const end = parseDate(leave.endDate);
    if (end < today || start > horizon) continue;
    const eventDate = start < today ? today : start;
    events.push({
      id: `leave-${leave.id}`,
      title: `${leave.employeeName} — ${leave.type.replace("_", " ")}`,
      date: eventDate.toISOString(),
      time: "All day",
      kind: "leave",
      href: leave.employeeId
        ? `/employees/${leave.employeeId}/leave`
        : `/holidays?date=${eventDate.toISOString().slice(0, 10)}`,
    });
  }

  for (const payroll of data.payrollRecords) {
    const date = parseDate(payroll.periodStart);
    if (date < today || date > horizon) continue;
    events.push({
      id: `payroll-${payroll.id}`,
      title: `Payroll — ${payroll.employeeName}`,
      date: payroll.periodStart,
      time: "10:00 AM",
      kind: "payroll",
      href: `/payroll`,
    });
  }

  for (const interview of data.interviews) {
    const scheduled = new Date(interview.scheduledAt);
    const date = parseDate(interview.scheduledAt);
    if (date < today || date > horizon) continue;
    events.push({
      id: `interview-${interview.id}`,
      title: `Interview — ${interview.candidateName}`,
      date: interview.scheduledAt,
      time: formatTime(scheduled.getHours()),
      kind: "interview",
      href: `/recruitment/candidates/${interview.applicationId}`,
    });
  }

  return events
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, limit);
}
