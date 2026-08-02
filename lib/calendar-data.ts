import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHolidays } from "@/lib/holidays-data";
import { fullName } from "@/lib/utils";

export type CalendarHoliday = {
  id: string;
  name: string;
  date: string;
  type: string;
};

export type CalendarLeave = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type CalendarInterview = {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: string;
  meetLink: string | null;
  status: string;
};

export type CalendarPayroll = {
  id: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
};

export type CalendarAttendanceRow = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string;
  employeeCode: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string | null;
};

export async function getCalendarData(session: {
  role: string;
  employeeId?: string;
}) {
  const holidays = await getHolidays();

  const leaveWhere: Prisma.LeaveRequestWhereInput =
    session.role === "EMPLOYEE" && session.employeeId
      ? {
          employeeId: session.employeeId,
          status: { in: ["APPROVED", "PENDING"] },
        }
      : { status: { in: ["APPROVED", "PENDING"] } };

  const [leaveRequests, interviews, payrollRecords, employees, attendanceRecords] =
    await Promise.all([
    prisma.leaveRequest.findMany({
      where: leaveWhere,
      include: { employee: true },
      orderBy: { startDate: "asc" },
    }),
    session.role === "EMPLOYEE"
      ? Promise.resolve([])
      : prisma.interview.findMany({
          where: { status: { in: ["SCHEDULED", "COMPLETED"] } },
          include: {
            application: { include: { job: true } },
          },
          orderBy: { scheduledAt: "asc" },
          take: 50,
        }),
    session.role === "EMPLOYEE" && session.employeeId
      ? prisma.payrollRecord.findMany({
          where: { employeeId: session.employeeId },
          include: { employee: true },
          orderBy: { periodStart: "desc" },
          take: 12,
        })
      : prisma.payrollRecord.findMany({
          include: { employee: true },
          orderBy: { periodStart: "desc" },
          take: 24,
        }),
    session.role === "EMPLOYEE" && session.employeeId
      ? prisma.employee.findMany({
          where: { id: session.employeeId },
          orderBy: { firstName: "asc" },
        })
      : prisma.employee.findMany({
          where: { status: "ACTIVE" },
          orderBy: { firstName: "asc" },
        }),
    session.role === "EMPLOYEE" && session.employeeId
      ? prisma.attendance.findMany({
          where: { employeeId: session.employeeId },
          orderBy: { date: "desc" },
          take: 60,
        })
      : prisma.attendance.findMany({
          orderBy: { date: "desc" },
          take: 200,
        }),
  ]);

  const attendanceRows: CalendarAttendanceRow[] = attendanceRecords.map((record) => {
    const employee = employees.find((e) => e.id === record.employeeId);
    if (!employee) {
      throw new Error(`Missing employee for attendance ${record.id}`);
    }
    return {
      id: record.id,
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatar: employee.avatar,
      jobTitle: employee.jobTitle,
      employeeCode: employee.employeeCode,
      date: record.date.toISOString(),
      checkIn: record.checkIn?.toISOString() ?? null,
      checkOut: record.checkOut?.toISOString() ?? null,
      status: record.status,
    };
  });

  return {
    holidays: holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
      type: h.type,
    })),
    leaveRequests: leaveRequests.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: fullName(l.employee.firstName, l.employee.lastName),
      type: l.type,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      status: l.status,
    })),
    interviews: interviews.map((interview) => ({
      id: interview.id,
      applicationId: interview.applicationId,
      candidateName: fullName(
        interview.application.firstName,
        interview.application.lastName
      ),
      jobTitle: interview.application.job.title,
      scheduledAt: interview.scheduledAt.toISOString(),
      meetLink: interview.googleMeetLink,
      status: interview.status,
    })),
    payrollRecords: payrollRecords.map((p) => ({
      id: p.id,
      employeeName: fullName(p.employee.firstName, p.employee.lastName),
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      status: p.status,
    })),
    attendanceRows,
    employees: employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      avatar: e.avatar,
      jobTitle: e.jobTitle,
      employeeCode: e.employeeCode,
    })),
  };
}
