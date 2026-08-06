import { prisma } from "@/lib/prisma";
import { companyHolidays2026 } from "@/lib/holidays";
import { holidayCompanyWhere, getCompanyScope } from "@/lib/company-scope";
import type { SessionUser } from "@/lib/auth";

export type HolidayRecord = {
  id: string;
  name: string;
  date: Date;
  type: string;
};

function staticHolidays(): HolidayRecord[] {
  return companyHolidays2026.map((holiday, index) => ({
    id: `static-${index}`,
    name: holiday.name,
    date: new Date(holiday.date),
    type: holiday.type,
  }));
}

function hasHolidayModel(): boolean {
  return typeof (prisma as { holiday?: { findMany: unknown } }).holiday?.findMany === "function";
}

export async function getHolidays(companyId?: string | null): Promise<HolidayRecord[]> {
  if (!hasHolidayModel()) {
    return staticHolidays();
  }

  const scope = getCompanyScope({
    id: "",
    email: "",
    role: "EMPLOYEE",
    companyId,
  } as SessionUser);

  let holidays = await prisma.holiday.findMany({
    where: holidayCompanyWhere(scope),
    orderBy: { date: "asc" },
  });

  if (holidays.length === 0 && companyId) {
    await prisma.holiday.createMany({
      data: companyHolidays2026.map((holiday) => ({
        name: holiday.name,
        date: new Date(holiday.date),
        type: holiday.type,
        companyId,
      })),
    });
    holidays = await prisma.holiday.findMany({
      where: holidayCompanyWhere(scope),
      orderBy: { date: "asc" },
    });
  }

  if (holidays.length === 0) {
    return staticHolidays();
  }

  return holidays;
}

export function isHolidayDbEnabled() {
  return hasHolidayModel();
}
