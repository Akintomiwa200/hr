const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isWorkingWeekday(day: number, workingDaysPerWeek: number) {
  if (workingDaysPerWeek >= 6) return day >= 1 && day <= 6;
  return day >= 1 && day <= 5;
}

export function periodMonthKey(date: Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function countExpectedWorkingDays(input: {
  periodStart: Date;
  periodEnd: Date;
  workingDaysPerWeek: number;
  holidayDates?: Date[];
}) {
  const start = startOfDay(input.periodStart);
  const end = startOfDay(input.periodEnd);
  const holidays = (input.holidayDates ?? []).map(startOfDay);
  const workingDaysPerWeek = input.workingDaysPerWeek === 6 ? 6 : 5;

  let count = 0;
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += DAY_MS) {
    const day = new Date(cursor);
    if (!isWorkingWeekday(day.getDay(), workingDaysPerWeek)) continue;
    if (holidays.some((holiday) => sameDay(holiday, day))) continue;
    count += 1;
  }
  return count;
}

export function attendanceDayWeight(status: string) {
  switch (status) {
    case "PRESENT":
    case "EARLY":
    case "LATE":
    case "REMOTE":
      return 1;
    case "HALF_DAY":
      return 0.5;
    default:
      return 0;
  }
}

export function countDaysWorked(attendance: Array<{ status: string }>) {
  return attendance.reduce((sum, row) => sum + attendanceDayWeight(row.status), 0);
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function proRatedBaseSalary(input: {
  monthlyBase: number;
  daysWorked: number;
  expectedWorkingDays: number;
}) {
  if (input.expectedWorkingDays <= 0) return roundMoney(input.monthlyBase);
  const dailyRate = input.monthlyBase / input.expectedWorkingDays;
  return roundMoney(dailyRate * input.daysWorked);
}

export function formatShortDates(dates: Date[]) {
  return dates
    .map((date) =>
      date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    )
    .join(", ");
}
