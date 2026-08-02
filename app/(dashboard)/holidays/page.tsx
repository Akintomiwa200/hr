import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCalendarData } from "@/lib/calendar-data";
import { isHolidayDbEnabled } from "@/lib/holidays-data";
import { CalendarModule } from "@/components/holidays/calendar-module";
import { PageHeader } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { date } = await searchParams;
  const data = await getCalendarData({
    role: session.role,
    employeeId: session.employeeId,
  });

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Holidays, schedule, and daily attendance in one view"
        action={<ModulePageActions helpSlug="calendar" helpLabel="Calendar guide" />}
      />
      <CalendarModule
        holidays={data.holidays}
        leaveRequests={data.leaveRequests}
        interviews={data.interviews}
        payrollRecords={data.payrollRecords}
        attendanceRows={data.attendanceRows}
        employees={data.employees}
        canManage={session.role === "ADMIN" && isHolidayDbEnabled()}
        showEmployeeColumn={session.role !== "EMPLOYEE"}
        initialDate={date}
      />
    </div>
  );
}
