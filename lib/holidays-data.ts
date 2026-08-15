import { prisma } from "@/lib/prisma";
import {
  companyHolidays2026,
  LEGACY_US_HOLIDAY_NAMES,
} from "@/lib/holidays";
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
    date: new Date(holiday.date + "T12:00:00.000Z"),
    type: holiday.type,
  }));
}

function hasHolidayModel(): boolean {
  return typeof (prisma as { holiday?: { findMany: unknown } }).holiday?.findMany === "function";
}

/** Replace outdated US demo holidays with official Nigeria 2026 public holidays. */
export async function syncCompanyHolidaysToOfficial(companyId: string) {
  const legacyCount = await prisma.holiday.count({
    where: {
      companyId,
      name: { in: [...LEGACY_US_HOLIDAY_NAMES] },
    },
  });

  const total = await prisma.holiday.count({ where: { companyId } });
  const hasUsIndependence = await prisma.holiday.findFirst({
    where: {
      companyId,
      name: "Independence Day",
      date: new Date("2026-07-04T00:00:00.000Z"),
    },
    select: { id: true },
  });

  // Empty calendar, or still carrying the old US pack → reseeds Nigeria list.
  if (total === 0 || legacyCount > 0 || hasUsIndependence) {
    await prisma.holiday.deleteMany({ where: { companyId } });
    await prisma.holiday.createMany({
      data: companyHolidays2026.map((holiday) => ({
        name: holiday.name,
        date: new Date(`${holiday.date}T12:00:00.000Z`),
        type: holiday.type,
        companyId,
      })),
    });
  }
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

  if (companyId) {
    await syncCompanyHolidaysToOfficial(companyId);
  }

  let holidays = await prisma.holiday.findMany({
    where: holidayCompanyWhere(scope),
    orderBy: { date: "asc" },
  });

  if (holidays.length === 0 && companyId) {
    await prisma.holiday.createMany({
      data: companyHolidays2026.map((holiday) => ({
        name: holiday.name,
        date: new Date(`${holiday.date}T12:00:00.000Z`),
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
