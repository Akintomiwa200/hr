import type { Role } from "@prisma/client";
import { getCalendarData } from "@/lib/calendar-data";

export type UpcomingCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: "holiday" | "leave" | "payroll" | "interview" | "personal" | "birthday" | "shifts";
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

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function getUpcomingCalendarEvents(
  session: { role: Role; employeeId?: string; companyId?: string | null; userId?: string },
  limit = 5
): Promise<UpcomingCalendarEvent[]> {
  const data = await getCalendarData(session);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);

  const events: UpcomingCalendarEvent[] = [];

  for (const employee of data.employees) {
    if (!employee.dateOfBirth) continue;
    const birthDate = new Date(employee.dateOfBirth);
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    if (nextBirthday > horizon) continue;
    events.push({
      id: `birthday-${employee.id}`,
      title: `${employee.firstName} ${employee.lastName}’s birthday`,
      date: nextBirthday.toISOString(),
      time: "All day",
      kind: "birthday",
      href: `/holidays?date=${nextBirthday.toISOString().slice(0, 10)}&category=birthday`,
    });
  }

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

  for (const shift of data.shifts) {
    const date = parseDate(shift.startAt);
    if (date < today || date > horizon) continue;
    events.push({
      id: `shift-${shift.id}`,
      title: `${shift.employeeName} — ${shift.title}`,
      date: shift.startAt,
      time: `${formatClock(shift.startAt)} – ${formatClock(shift.endAt)}`,
      kind: "shifts",
      href: `/holidays?date=${shift.startAt.slice(0, 10)}&category=shifts`,
    });
  }

  for (const event of data.personalEvents) {
    const start = parseDate(event.startAt);
    const end = event.endAt ? parseDate(event.endAt) : start;
    if (end < today || start > horizon) continue;
    const eventDate = start < today ? today : start;
    const time = event.allDay
      ? "All day"
      : event.endAt
        ? `${formatClock(event.startAt)} – ${formatClock(event.endAt)}`
        : formatClock(event.startAt);
    events.push({
      id: `personal-${event.id}`,
      title: event.title,
      date: eventDate.toISOString(),
      time,
      kind: "personal",
      href: `/holidays?date=${eventDate.toISOString().slice(0, 10)}&category=personal`,
    });
  }

  return events
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, limit);
}
