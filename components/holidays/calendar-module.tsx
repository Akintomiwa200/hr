"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { fullName } from "@/lib/utils";
import type {
  CalendarAttendanceRow,
  CalendarHoliday,
  CalendarInterview,
  CalendarLeave,
  CalendarPayroll,
  CalendarPersonalEvent,
  CalendarShift,
} from "@/lib/calendar-data";
import { CalendarAttendanceTable } from "@/components/holidays/calendar-attendance-table";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_KEYS = [
  "all",
  "holiday",
  "birthday",
  "leave",
  "payroll",
  "interview",
  "attendance",
  "personal",
  "shifts",
] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

const PERSONAL_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  violet: { bg: "bg-violet-100", color: "text-violet-600", dot: "bg-violet-400" },
  amber: { bg: "bg-amber-100", color: "text-amber-600", dot: "bg-amber-400" },
  emerald: { bg: "bg-emerald-100", color: "text-emerald-600", dot: "bg-emerald-400" },
  sky: { bg: "bg-sky-100", color: "text-sky-600", dot: "bg-sky-400" },
  rose: { bg: "bg-rose-100", color: "text-rose-600", dot: "bg-rose-400" },
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeValue(value: string) {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${period}`;
}

function formatClockTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ScheduleItem = {
  id: string;
  title: string;
  time: string;
  description?: string;
  href?: string;
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
  kind: "holiday" | "leave" | "interview" | "payroll" | "attendance" | "birthday" | "personal" | "shifts";
  holiday?: CalendarHoliday;
  personal?: CalendarPersonalEvent;
  shift?: CalendarShift;
};

export function CalendarModule({
  holidays,
  leaveRequests,
  interviews,
  payrollRecords,
  attendanceRows,
  employees,
  personalEvents,
  shifts,
  canManage,
  canManageShifts,
  showEmployeeColumn = true,
  initialDate,
  initialCategory,
}: {
  holidays: CalendarHoliday[];
  leaveRequests: CalendarLeave[];
  interviews: CalendarInterview[];
  payrollRecords: CalendarPayroll[];
  attendanceRows: CalendarAttendanceRow[];
  employees: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string;
    employeeCode: string;
    dateOfBirth?: string | null;
  }[];
  personalEvents: CalendarPersonalEvent[];
  shifts: CalendarShift[];
  canManage: boolean;
  canManageShifts: boolean;
  showEmployeeColumn?: boolean;
  initialDate?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parsedInitialDate = useMemo(() => {
    if (!initialDate) return today;
    const d = parseDate(initialDate);
    return Number.isNaN(d.getTime()) ? today : d;
  }, [initialDate, today]);

  const [selectedDate, setSelectedDate] = useState(parsedInitialDate);
  const [weekAnchor, setWeekAnchor] = useState(parsedInitialDate);
  const [createOpen, setCreateOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<CalendarHoliday | null>(null);
  const [deleteHoliday, setDeleteHoliday] = useState<CalendarHoliday | null>(null);
  const [form, setForm] = useState({ name: "", date: "", type: "Public" });
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarPersonalEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<CalendarPersonalEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    allDay: false,
    startTime: "09:00",
    endTime: "",
    notes: "",
    color: "violet",
    visibility: "PRIVATE",
    sharedWith: [] as string[],
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<CalendarShift | null>(null);
  const [deleteShift, setDeleteShift] = useState<CalendarShift | null>(null);
  const [shiftForm, setShiftForm] = useState({ employeeId: "", title: "Shift", date: "", startTime: "09:00", endTime: "17:00", notes: "" });
  const [shiftLoading, setShiftLoading] = useState(false);

  const categories = [
    { key: "all", label: "All" },
    { key: "holiday", label: "Holidays" },
    { key: "personal", label: "My calendar" },
    { key: "shifts", label: "Shift & scheduling" },
    { key: "birthday", label: "Birthdays" },
    { key: "leave", label: "Leave" },
    { key: "payroll", label: "Payroll" },
    { key: "interview", label: "Interviews" },
    { key: "attendance", label: "Attendance" },
  ] as const;
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory && (CATEGORY_KEYS as readonly string[]).includes(initialCategory)
      ? initialCategory
      : "all"
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      date.setHours(0, 0, 0, 0);
      return date;
    });
  }, [weekAnchor]);

  const holidaysByDay = useMemo(() => {
    const map = new Map<string, CalendarHoliday[]>();
    for (const holiday of holidays) {
      const key = dateKey(parseDate(holiday.date));
      const list = map.get(key) ?? [];
      list.push(holiday);
      map.set(key, list);
    }
    return map;
  }, [holidays]);

  const selectedYear = selectedDate.getFullYear();

  const birthdaysByDay = useMemo(() => {
    const map = new Map<string, { id: string; firstName: string; lastName: string; employeeCode: string; avatar: string | null; jobTitle: string }[]>();
    for (const emp of employees) {
      if (!emp.dateOfBirth) continue;
      const d = new Date(emp.dateOfBirth);
      if (Number.isNaN(d.getTime())) continue;
      d.setFullYear(selectedYear);
      const key = dateKey(d);
      const list = map.get(key) ?? [];
      list.push({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: emp.employeeCode,
        avatar: emp.avatar,
        jobTitle: emp.jobTitle,
      });
      map.set(key, list);
    }
    return map;
  }, [employees, selectedYear]);

  const personalByDay = useMemo(() => {
    const map = new Map<string, CalendarPersonalEvent[]>();
    for (const event of personalEvents) {
      const start = parseDate(event.startAt);
      const end = event.endAt ? parseDate(event.endAt) : start;
      if (Number.isNaN(start.getTime())) continue;
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 366) {
        const key = dateKey(cursor);
        const list = map.get(key) ?? [];
        if (!list.some((entry) => entry.id === event.id)) list.push(event);
        map.set(key, list);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return map;
  }, [personalEvents]);

  const dayBirthdays = (date: Date) =>
    birthdaysByDay.get(dateKey(date)) ?? [];

  const dayHasEvents = (date: Date) => {
    const key = dateKey(date);

    if ((activeCategory === "all" || activeCategory === "holiday") && (holidaysByDay.get(key)?.length ?? 0) > 0) return true;

    const inLeave = leaveRequests.some((l) => {
      const start = parseDate(l.startDate);
      const end = parseDate(l.endDate);
      return date >= start && date <= end;
    });
    if ((activeCategory === "all" || activeCategory === "leave") && inLeave) return true;

    const payroll = payrollRecords.some((p) => dateKey(parseDate(p.periodStart)) === key);
    if ((activeCategory === "all" || activeCategory === "payroll") && payroll) return true;

    const interview = interviews.some((i) => dateKey(parseDate(i.scheduledAt)) === key);
    if ((activeCategory === "all" || activeCategory === "interview") && interview) return true;

    const attendance = attendanceRows.some((row) => row.date.slice(0, 10) === key);
    if ((activeCategory === "all" || activeCategory === "attendance") && attendance) return true;

    if ((activeCategory === "all" || activeCategory === "birthday") && dayBirthdays(date).length > 0) return true;

    if ((activeCategory === "all" || activeCategory === "personal") && (personalByDay.get(key)?.length ?? 0) > 0) return true;
    if ((activeCategory === "all" || activeCategory === "shifts") && shifts.some((shift) => dateKey(parseDate(shift.startAt)) === key)) return true;

    return false;
  };

  const scheduleItems = useMemo(() => {
    const key = dateKey(selectedDate);
    const items: ScheduleItem[] = [];

    for (const holiday of holidaysByDay.get(key) ?? []) {
      items.push({
        id: `holiday-${holiday.id}`,
        title: holiday.name,
        time: "All day",
        icon: CalendarDays,
        iconBg: "bg-violet-100",
        iconColor: "text-violet-600",
        kind: "holiday",
        holiday,
      });
    }

    const birthdaysOnDay = birthdaysByDay.get(key) ?? [];
    for (const b of birthdaysOnDay) {
      items.push({
        id: `birthday-${b.id}`,
        title: `${fullName(b.firstName, b.lastName)}'s birthday`,
        time: "Happy Birthday!",
        href: `/employees/${b.id}`,
        icon: Cake,
        iconBg: "bg-rose-100",
        iconColor: "text-rose-500",
        kind: "birthday",
      });
    }

    for (const leave of leaveRequests) {
      const start = parseDate(leave.startDate);
      const end = parseDate(leave.endDate);
      if (selectedDate >= start && selectedDate <= end) {
        items.push({
          id: `leave-${leave.id}`,
          title: `${leave.employeeName} — ${leave.type.replace("_", " ")}`,
          time: "All day",
          href: `/employees/${leave.employeeId}/leave`,
          icon: UserRound,
          iconBg: "bg-sky-100",
          iconColor: "text-sky-600",
          kind: "leave",
        });
      }
    }

    for (const payroll of payrollRecords) {
      if (dateKey(parseDate(payroll.periodStart)) === key) {
        const month = MONTHS[parseDate(payroll.periodStart).getMonth()];
        items.push({
          id: `payroll-${payroll.id}`,
          title: `Payroll ${month}`,
          time: "10:00 AM",
          href: "/payroll",
          icon: Wallet,
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          kind: "payroll",
        });
      }
    }

    for (const interview of interviews) {
      if (dateKey(parseDate(interview.scheduledAt)) === key) {
        const hour = parseDate(interview.scheduledAt).getHours();
        items.push({
          id: `interview-${interview.id}`,
          title: `Interview: ${interview.candidateName}`,
          time: formatTime(hour),
          href: `/recruitment/candidates/${interview.applicationId}`,
          icon: Briefcase,
          iconBg: "bg-orange-100",
          iconColor: "text-orange-600",
          kind: "interview",
        });
      }
    }

    for (const event of personalByDay.get(key) ?? []) {
      const colors = PERSONAL_COLORS[event.color] ?? PERSONAL_COLORS.violet;
      const time = event.allDay
        ? "All day"
        : event.endAt
          ? `${formatClockTime(event.startAt)} – ${formatClockTime(event.endAt)}`
          : formatClockTime(event.startAt);
      items.push({
        id: `personal-${event.id}`,
        title: event.title,
        time,
        description: event.notes ?? undefined,
        icon: StickyNote,
        iconBg: colors.bg,
        iconColor: colors.color,
        kind: "personal",
        personal: event,
      });
    }

    for (const shift of shifts.filter((item) => dateKey(parseDate(item.startAt)) === key)) {
      items.push({
        id: `shift-${shift.id}`,
        title: `${shift.employeeName} — ${shift.title}`,
        time: `${formatClockTime(shift.startAt)} – ${formatClockTime(shift.endAt)}`,
        description: shift.notes ?? undefined,
        icon: CalendarDays,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-700",
        kind: "shifts",
        shift,
      });
    }

    const attendanceForDay = attendanceRows.filter((row) => row.date.slice(0, 10) === key);
    if (attendanceForDay.length > 0) {
      items.push({
        id: `attendance-${key}`,
        title:
          attendanceForDay.length === 1
            ? `${fullName(attendanceForDay[0].firstName, attendanceForDay[0].lastName)} checked in`
            : `${attendanceForDay.length} employees checked in`,
        time: formatClockTime(attendanceForDay[0].checkIn),
        href: "/attendance",
        icon: Clock,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        kind: "attendance",
      });
    }

    return activeCategory === "all" ? items : items.filter((i) => i.kind === activeCategory);
  }, [selectedDate, holidaysByDay, birthdaysByDay, personalByDay, leaveRequests, payrollRecords, interviews, attendanceRows, shifts, activeCategory]);

  const shiftWeek = (delta: number) => {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + delta * 7);
    setWeekAnchor(next);
    setSelectedDate(new Date(next));
  };

  const openCreate = () => {
    setForm({ name: "", date: dateKey(selectedDate), type: "Public" });
    setCreateOpen(true);
  };

  const openEdit = (holiday: CalendarHoliday) => {
    setEditHoliday(holiday);
    setForm({
      name: holiday.name,
      date: dateKey(parseDate(holiday.date)),
      type: holiday.type,
    });
  };

  const openEventCreate = () => {
    setEditingEvent(null);
    setEventForm({
      title: "",
      date: dateKey(selectedDate),
      allDay: false,
      startTime: "09:00",
      endTime: "",
      notes: "",
      color: "violet",
      visibility: "PRIVATE",
      sharedWith: [],
    });
    setEventOpen(true);
  };

  const openEventEdit = (event: CalendarPersonalEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      date: dateKey(parseDate(event.startAt)),
      allDay: event.allDay,
      startTime: timeValue(event.startAt),
      endTime: event.endAt ? timeValue(event.endAt) : "",
      notes: event.notes ?? "",
      color: event.color,
      visibility: event.visibility,
      sharedWith: event.sharedWith,
    });
    setEventOpen(true);
  };

  const closeEventDialog = () => {
    setEventOpen(false);
    setTimeout(() => setEditingEvent(null), 200);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim()) {
      notify.error("Give your event a title");
      return;
    }
    if (!eventForm.date) {
      notify.error("Pick a date for your event");
      return;
    }

    const startAt = eventForm.allDay
      ? new Date(`${eventForm.date}T12:00:00`)
      : new Date(`${eventForm.date}T${eventForm.startTime || "09:00"}:00`);

    if (Number.isNaN(startAt.getTime())) {
      notify.error("That date or time is not valid");
      return;
    }

    let endAt: Date | null = null;
    if (!eventForm.allDay && eventForm.endTime) {
      endAt = new Date(`${eventForm.date}T${eventForm.endTime}:00`);
      if (Number.isNaN(endAt.getTime())) {
        notify.error("That end time is not valid");
        return;
      }
      if (endAt <= startAt) {
        endAt.setDate(endAt.getDate() + 1);
      }
    }

    setEventLoading(true);
    try {
      const res = await fetch(
        editingEvent ? `/api/calendar-events/${editingEvent.id}` : "/api/calendar-events",
        {
          method: editingEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: eventForm.title,
            notes: eventForm.notes,
            startAt: startAt.toISOString(),
            endAt: endAt?.toISOString() ?? null,
            allDay: eventForm.allDay,
            color: eventForm.color,
            visibility: eventForm.visibility,
            sharedWith: eventForm.sharedWith,
          }),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save event"));
        return;
      }
      notify.success(editingEvent ? "Personal event updated" : "Personal event added");
      closeEventDialog();
      router.refresh();
    } catch {
      notify.error("Failed to save event");
    } finally {
      setEventLoading(false);
    }
  };

  const removeEvent = async () => {
    if (!deleteEvent) return;
    setEventLoading(true);
    try {
      const res = await fetch(`/api/calendar-events/${deleteEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete event"));
        return;
      }
      notify.success("Personal event deleted");
      setDeleteEvent(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete event");
    } finally {
      setEventLoading(false);
    }
  };

  const openShiftCreate = () => {
    setEditingShift(null);
    setShiftForm({ employeeId: employees[0]?.id ?? "", title: "Shift", date: dateKey(selectedDate), startTime: "09:00", endTime: "17:00", notes: "" });
    setShiftOpen(true);
  };

  const openShiftEdit = (shift: CalendarShift) => {
    setEditingShift(shift);
    setShiftForm({
      employeeId: shift.employeeId,
      title: shift.title,
      date: dateKey(new Date(shift.startAt)),
      startTime: timeValue(shift.startAt),
      endTime: timeValue(shift.endAt),
      notes: shift.notes ?? "",
    });
    setShiftOpen(true);
  };

  const saveShift = async () => {
    if (!shiftForm.employeeId || !shiftForm.date || !shiftForm.title.trim()) {
      notify.error("Choose an employee, date, and shift title");
      return;
    }
    const startAt = new Date(`${shiftForm.date}T${shiftForm.startTime}:00`);
    const endAt = new Date(`${shiftForm.date}T${shiftForm.endTime}:00`);
    if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);
    setShiftLoading(true);
    try {
      const res = await fetch(editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts", {
        method: editingShift ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: shiftForm.employeeId, title: shiftForm.title, notes: shiftForm.notes, startAt: startAt.toISOString(), endAt: endAt.toISOString() }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save shift"));
        return;
      }
      notify.success(editingShift ? "Shift updated" : "Shift scheduled");
      setShiftOpen(false);
      setEditingShift(null);
      router.refresh();
    } catch {
      notify.error("Failed to save shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const removeShift = async () => {
    if (!deleteShift) return;
    setShiftLoading(true);
    try {
      const res = await fetch(`/api/shifts/${deleteShift.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete shift"));
        return;
      }
      notify.success("Shift removed");
      setDeleteShift(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const save = async (mode: "create" | "edit") => {
    setLoading(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/holidays" : `/api/holidays/${editHoliday!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save holiday"));
        return;
      }
      notify.success(mode === "create" ? "Holiday added successfully" : "Holiday updated successfully");
      setCreateOpen(false);
      setEditHoliday(null);
      router.refresh();
    } catch {
      notify.error("Failed to save holiday");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!deleteHoliday) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays/${deleteHoliday.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete holiday"));
        return;
      }
      notify.success("Holiday deleted successfully");
      setDeleteHoliday(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete holiday");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Month navigator */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h2>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal week strip */}
        <div className="px-4 pb-6">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const isSelected = dateKey(date) === dateKey(selectedDate);
              const isToday = dateKey(date) === dateKey(today);
              const hasEvents = dayHasEvents(date);

              return (
                <button
                  key={dateKey(date)}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className="flex flex-col items-center gap-2 py-2 rounded-2xl transition-colors hover:bg-gray-50"
                >
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    {WEEKDAYS_SHORT[date.getDay()]}
                  </span>
                  <span
                    className={`relative flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full transition-all ${
                      isSelected
                        ? "bg-[#7B61FF] text-white shadow-md shadow-violet-200"
                        : isToday
                          ? "bg-violet-50 text-violet-700 ring-2 ring-violet-200"
                          : "text-gray-800"
                    }`}
                  >
                    {date.getDate()}
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#7B61FF]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 px-6 pb-4 flex-wrap">
          {categories.map((cat) => {
            const active = cat.key === activeCategory;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  active
                    ? "bg-[#7B61FF] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Schedule header */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            {formatLongDate(selectedDate)}
          </h3>
          <div className="flex items-center gap-2">
            {activeCategory === "personal" || activeCategory === "all" ? (
              <Button size="sm" onClick={openEventCreate}>
                <Plus className="w-4 h-4" />
                Add event
              </Button>
            ) : activeCategory === "holiday" && canManage ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Add
              </Button>
            ) : null}
            {canManageShifts && (activeCategory === "all" || activeCategory === "shifts") && (
              <Button size="sm" variant="secondary" onClick={openShiftCreate}>
                <Plus className="w-4 h-4" />Schedule shift
              </Button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 py-1 bg-white border border-gray-100 rounded-xl shadow-lg">
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setSelectedDate(today);
                        setWeekAnchor(today);
                        setMenuOpen(false);
                      }}
                    >
                      Go to today
                    </button>
                    <Link
                      href="/attendance"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      View attendance
                    </Link>
                    <Link
                      href="/leave"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      View leave
                    </Link>
                    <Link
                      href="/payroll"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      View payroll
                    </Link>
                    <Link
                      href="/reports/employee-data/birthday"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      View birthdays
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule list */}
        <div className="px-4 pb-6 space-y-3">
          {scheduleItems.length === 0 ? (
            <div className="mx-2 py-10 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
              <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {activeCategory === "all"
                  ? "No calendar items for this day."
                  : activeCategory === "holiday"
                  ? "No holidays scheduled for this day."
                  : activeCategory === "personal"
                    ? "No personal events for this day."
                    : activeCategory === "shifts"
                      ? "No shifts scheduled for this day."
                    : `No ${categories.find((c) => c.key === activeCategory)?.label.toLowerCase()} for this day.`}
              </p>
              {activeCategory === "personal" ? (
                <Button variant="secondary" size="sm" className="mt-4" onClick={openEventCreate}>
                  Add personal event
                </Button>
              ) : activeCategory === "holiday" && canManage ? (
                <Button variant="secondary" size="sm" className="mt-4" onClick={openCreate}>
                  Add holiday
                </Button>
              ) : null}
              {activeCategory === "shifts" && canManageShifts && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={openShiftCreate}>Schedule a shift</Button>
              )}
            </div>
          ) : (
            scheduleItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm transition-all">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                  >
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canManage && item.kind === "holiday" && item.holiday && !item.holiday.id.startsWith("static-") && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEdit(item.holiday!);
                          }}
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteHoliday(item.holiday!);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {item.kind === "personal" && item.personal?.canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEventEdit(item.personal!);
                          }}
                          className="p-2 text-gray-400 hover:text-violet-600 rounded-lg"
                          title="Edit event"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteEvent(item.personal!);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {item.kind === "shifts" && item.shift && canManageShifts && (
                      <>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShiftEdit(item.shift!); }} className="p-2 text-gray-400 hover:text-violet-600 rounded-lg" title="Edit shift"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteShift(item.shift!); }} className="p-2 text-gray-400 hover:text-red-600 rounded-lg" title="Delete shift"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                    <ChevronRightSmall className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              );

              return item.href ? (
                <Link key={item.id} href={item.href}>
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })
          )}
        </div>
      </Card>

      <div className="mt-6">
        <CalendarAttendanceTable
          selectedDate={selectedDate}
          employees={employees}
          attendanceRows={attendanceRows}
          showEmployeeColumn={showEmployeeColumn}
        />
      </div>

      <Dialog
        open={createOpen || !!editHoliday}
        onClose={() => {
          setCreateOpen(false);
          setEditHoliday(null);
        }}
        title={editHoliday ? "Edit Holiday" : "Add Holiday"}
      >
        <div className="space-y-4">
          <input
            className={inputClass}
            placeholder="Holiday name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="Public">Public</option>
            <option value="Company">Company</option>
          </select>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setEditHoliday(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={loading} onClick={() => save(editHoliday ? "edit" : "create")}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!deleteHoliday} onClose={() => setDeleteHoliday(null)} title="Delete Holiday">
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteHoliday?.name}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteHoliday(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            Delete
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={eventOpen || !!editingEvent}
        onClose={closeEventDialog}
        title={editingEvent ? "Edit personal event" : "Add personal event"}
      >
        <div className="space-y-4">
          <input
            className={inputClass}
            placeholder="Event title"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={eventForm.date}
            onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={eventForm.allDay}
              onChange={(e) => setEventForm({ ...eventForm, allDay: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            All day
          </label>

          {!eventForm.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Starts</label>
                <input
                  type="time"
                  className={inputClass}
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Ends <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="time"
                  className={inputClass}
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                />
              </div>
            </div>
          )}

          <textarea
            className={inputClass}
            rows={3}
            placeholder="Notes (optional)"
            value={eventForm.notes}
            onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
          />

          <label className="block text-sm text-gray-700">Visibility
            <select className={`${inputClass} mt-1`} value={eventForm.visibility}
              onChange={(e) => setEventForm({ ...eventForm, visibility: e.target.value })}>
              <option value="PRIVATE">Private — only me</option>
              <option value="PUBLIC">Public — everyone in my company</option>
              <option value="SELECTED">Selected people</option>
            </select>
          </label>
          {eventForm.visibility === "SELECTED" && (
            <fieldset className="max-h-36 overflow-auto rounded-xl border border-gray-200 p-3 space-y-2">
              <legend className="px-1 text-xs text-gray-500">Share with</legend>
              {employees.filter((employee) => employee.userId).map((employee) => (
                <label key={employee.userId} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={eventForm.sharedWith.includes(employee.userId)}
                    onChange={(e) => setEventForm({ ...eventForm, sharedWith: e.target.checked
                      ? [...eventForm.sharedWith, employee.userId]
                      : eventForm.sharedWith.filter((id) => id !== employee.userId) })} />
                  {fullName(employee.firstName, employee.lastName)}
                </label>
              ))}
            </fieldset>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 mr-1">Color</span>
            {Object.entries(PERSONAL_COLORS).map(([value, colors]) => (
              <button
                key={value}
                type="button"
                onClick={() => setEventForm({ ...eventForm, color: value })}
                className={`w-5 h-5 rounded-full ${colors.dot} ${
                  eventForm.color === value ? "ring-2 ring-offset-2 ring-violet-500" : ""
                }`}
                aria-label={`Use ${value} color`}
              />
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Public events are visible across your company. Selected events are visible only to the people you choose.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeEventDialog}>
              Cancel
            </Button>
            <Button loading={eventLoading} onClick={saveEvent}>
              {editingEvent ? "Save changes" : "Add event"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteEvent}
        onClose={() => setDeleteEvent(null)}
        title="Delete personal event"
      >
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteEvent?.title}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteEvent(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={eventLoading} onClick={removeEvent}>
            Delete
          </Button>
        </div>
      </Dialog>
      <Dialog open={shiftOpen} onClose={() => { setShiftOpen(false); setEditingShift(null); }} title={editingShift ? "Edit scheduled shift" : "Schedule a shift"}>
        <div className="space-y-4">
          <select className={inputClass} value={shiftForm.employeeId} onChange={(e) => setShiftForm({ ...shiftForm, employeeId: e.target.value })}>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee.firstName, employee.lastName)}{employee.jobTitle ? ` — ${employee.jobTitle}` : ""}</option>)}
          </select>
          <input className={inputClass} placeholder="Shift name (e.g. Morning shift)" value={shiftForm.title} onChange={(e) => setShiftForm({ ...shiftForm, title: e.target.value })} />
          <input type="date" className={inputClass} value={shiftForm.date} onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-500">Starts<input type="time" className={`${inputClass} mt-1`} value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></label>
            <label className="text-xs text-gray-500">Ends<input type="time" className={`${inputClass} mt-1`} value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></label>
          </div>
          <textarea className={inputClass} rows={3} placeholder="Notes (optional)" value={shiftForm.notes} onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setShiftOpen(false); setEditingShift(null); }}>Cancel</Button><Button loading={shiftLoading} onClick={saveShift}>{editingShift ? "Save shift" : "Schedule shift"}</Button></div>
        </div>
      </Dialog>
      <Dialog open={!!deleteShift} onClose={() => setDeleteShift(null)} title="Remove shift">
        <p className="mb-5 text-sm text-gray-600">Remove the shift for <strong>{deleteShift?.employeeName}</strong>?</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteShift(null)}>Cancel</Button><Button variant="danger" loading={shiftLoading} onClick={removeShift}>Remove shift</Button></div>
      </Dialog>
    </>
  );
}
