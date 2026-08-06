import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-auth";
import { getHolidays } from "@/lib/holidays-data";
import { getCompanyScope, employeeCompanyWhere, announcementCompanyWhere } from "@/lib/company-scope";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ employees: [], documents: [], jobs: [], announcements: [], holidays: [] });
  }

  const contains = { contains: q };

  const scope = getCompanyScope(session);
  const orgEmployeeFilter = employeeCompanyWhere(scope);

  const employeeWhere =
    session.role === "EMPLOYEE" && session.employeeId
      ? {
          id: session.employeeId,
          ...orgEmployeeFilter,
          OR: [
            { firstName: contains },
            { lastName: contains },
            { email: contains },
            { employeeCode: contains },
            { jobTitle: contains },
          ],
        }
      : {
          ...orgEmployeeFilter,
          OR: [
            { firstName: contains },
            { lastName: contains },
            { email: contains },
            { employeeCode: contains },
            { jobTitle: contains },
          ],
        };

  const documentWhere =
    session.role === "EMPLOYEE" && session.employeeId
      ? {
          OR: [
            { employeeId: null, title: contains },
            { employeeId: session.employeeId, title: contains },
          ],
        }
      : { title: contains };

  const [employees, documents, jobs, announcements, allHolidays] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: { department: true },
      take: 8,
      orderBy: { firstName: "asc" },
    }),
    prisma.document.findMany({
      where: documentWhere,
      include: { employee: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    session.role === "EMPLOYEE"
      ? Promise.resolve([])
      : prisma.job.findMany({
          where: {
            OR: [{ title: contains }, { location: contains }, { description: contains }],
          },
          include: { department: true },
          take: 6,
          orderBy: { postedAt: "desc" },
        }),
    prisma.announcement.findMany({
      where: {
        ...announcementCompanyWhere(scope),
        OR: [{ title: contains }, { content: contains }],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    getHolidays(session.companyId),
  ]);

  const holidays = allHolidays
    .filter(
      (holiday) =>
        holiday.name.toLowerCase().includes(q.toLowerCase()) ||
        holiday.type.toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 6)
    .map((holiday) => ({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date.toISOString(),
      type: holiday.type,
    }));

  return NextResponse.json({ employees, documents, jobs, announcements, holidays });
}
