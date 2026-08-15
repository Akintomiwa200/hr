export type CompanyHoliday = {
  name: string;
  date: string;
  type: "Public" | "Company";
};

/**
 * Official Nigeria federal public holidays for 2026.
 * Islamic dates follow widely published FG calendars and may shift ±1 day by moon sighting.
 * Source references: Federal Ministry of Interior / FMINO declarations and High Commission calendar.
 */
export const companyHolidays2026: CompanyHoliday[] = [
  { name: "New Year's Day", date: "2026-01-01", type: "Public" },
  { name: "Eid el-Fitr", date: "2026-03-20", type: "Public" },
  { name: "Eid el-Fitr Holiday", date: "2026-03-21", type: "Public" },
  { name: "Good Friday", date: "2026-04-03", type: "Public" },
  { name: "Easter Monday", date: "2026-04-06", type: "Public" },
  { name: "Workers' Day", date: "2026-05-01", type: "Public" },
  { name: "Eid el-Adha", date: "2026-05-27", type: "Public" },
  { name: "Eid el-Adha Holiday", date: "2026-05-28", type: "Public" },
  { name: "Democracy Day", date: "2026-06-12", type: "Public" },
  { name: "Eid el-Maulud", date: "2026-08-26", type: "Public" },
  { name: "Independence Day", date: "2026-10-01", type: "Public" },
  { name: "Christmas Day", date: "2026-12-25", type: "Public" },
  { name: "Boxing Day", date: "2026-12-26", type: "Public" },
];

/** Legacy US demo holiday names — replaced when syncing calendars to Nigeria. */
export const LEGACY_US_HOLIDAY_NAMES = [
  "Martin Luther King Jr. Day",
  "Presidents' Day",
  "Company Founders Day",
  "Memorial Day",
  "Juneteenth",
  "Labor Day",
  "Thanksgiving",
  "Day After Thanksgiving",
  "Christmas Eve",
] as const;
