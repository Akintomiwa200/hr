import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageOrgContent } from "@/lib/roles";
import { getCalendarData } from "@/lib/calendar-data";
import { isHolidayDbEnabled } from "@/lib/holidays-data";
import { CalendarModule } from "@/components/holidays/calendar-module";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; category?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { date, category } = await searchParams;
  const data = await getCalendarData({
    role: session.role,
    employeeId: session.employeeId,
    companyId: session.companyId,
    userId: session.id,
  });

  return (
    <div>
      <PageHeader
        title={category === "shifts" ? "Shift & Scheduling" : "Calendar"}
        description={category === "shifts" ? "Assign employee shifts and see the team schedule" : "Holidays, events, shifts, and daily attendance in one view"}
        action={<ModulePageActions helpSlug="calendar" helpLabel="Calendar guide" />}
      />
      <CalendarModule
        holidays={data.holidays}
        leaveRequests={data.leaveRequests}
        interviews={data.interviews}
        payrollRecords={data.payrollRecords}
        attendanceRows={data.attendanceRows}
        employees={data.employees}
        personalEvents={data.personalEvents}
        shifts={data.shifts}
        canManage={canManageOrgContent(session.role) && isHolidayDbEnabled()}
        canManageShifts={canManageOrgContent(session.role)}
        showEmployeeColumn={session.role !== "EMPLOYEE"}
        initialDate={date}
        initialCategory={category}
      />
      <PageLiveRefresh
        types={[
          "holiday_updated",
          "calendar_event_updated",
          "shift_updated",
          "leave_updated",
          "payroll_updated",
          "interview_updated",
          "attendance_updated",
          "employee_updated",
          "notification_updated",
        ]}
      />
    </div>
  );
}
