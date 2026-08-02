import { prisma } from "@/lib/prisma";
import { companyHolidays2026 } from "@/lib/holidays";

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

export async function getHolidays(): Promise<HolidayRecord[]> {
  if (!hasHolidayModel()) {
    return staticHolidays();
  }

  let holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  if (holidays.length === 0) {
    await prisma.holiday.createMany({
      data: companyHolidays2026.map((holiday) => ({
        name: holiday.name,
        date: new Date(holiday.date),
        type: holiday.type,
      })),
    });
    holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  }

  return holidays;
}

export function isHolidayDbEnabled() {
  return hasHolidayModel();
}
