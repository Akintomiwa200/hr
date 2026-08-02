"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
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
} from "@/lib/calendar-data";
import { CalendarAttendanceTable } from "@/components/holidays/calendar-attendance-table";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
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
  href?: string;
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
  kind: "holiday" | "leave" | "interview" | "payroll" | "attendance";
  holiday?: CalendarHoliday;
};

export function CalendarModule({
  holidays,
  leaveRequests,
  interviews,
  payrollRecords,
  attendanceRows,
  employees,
  canManage,
  showEmployeeColumn = true,
  initialDate,
}: {
  holidays: CalendarHoliday[];
  leaveRequests: CalendarLeave[];
  interviews: CalendarInterview[];
  payrollRecords: CalendarPayroll[];
  attendanceRows: CalendarAttendanceRow[];
  employees: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    jobTitle: string;
    employeeCode: string;
  }[];
  canManage: boolean;
  showEmployeeColumn?: boolean;
  initialDate?: string;
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

  const dayHasEvents = (date: Date) => {
    const key = dateKey(date);
    if ((holidaysByDay.get(key)?.length ?? 0) > 0) return true;

    const inLeave = leaveRequests.some((l) => {
      const start = parseDate(l.startDate);
      const end = parseDate(l.endDate);
      return date >= start && date <= end;
    });
    if (inLeave) return true;

    const payroll = payrollRecords.some((p) => dateKey(parseDate(p.periodStart)) === key);
    if (payroll) return true;

    const interview = interviews.some((i) => dateKey(parseDate(i.scheduledAt)) === key);
    if (interview) return true;

    const attendance = attendanceRows.some((row) => row.date.slice(0, 10) === key);
    return attendance;
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

    return items;
  }, [selectedDate, holidaysByDay, leaveRequests, payrollRecords, interviews, attendanceRows]);

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

        {/* Schedule header */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            {formatLongDate(selectedDate)}
          </h3>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Add
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
              <p className="text-sm text-gray-500">No events scheduled for this day.</p>
              {canManage && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={openCreate}>
                  Add holiday
                </Button>
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
    </>
  );
}
