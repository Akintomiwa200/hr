export type CompanyHoliday = {
  name: string;
  date: string;
  type: "Public" | "Company";
};

export const companyHolidays2026: CompanyHoliday[] = [
  { name: "New Year's Day", date: "2026-01-01", type: "Public" },
  { name: "Martin Luther King Jr. Day", date: "2026-01-19", type: "Public" },
  { name: "Presidents' Day", date: "2026-02-16", type: "Public" },
  { name: "Company Founders Day", date: "2026-03-15", type: "Company" },
  { name: "Memorial Day", date: "2026-05-25", type: "Public" },
  { name: "Juneteenth", date: "2026-06-19", type: "Public" },
  { name: "Independence Day", date: "2026-07-04", type: "Public" },
  { name: "Labor Day", date: "2026-09-07", type: "Public" },
  { name: "Thanksgiving", date: "2026-11-26", type: "Public" },
  { name: "Day After Thanksgiving", date: "2026-11-27", type: "Company" },
  { name: "Christmas Eve", date: "2026-12-24", type: "Company" },
  { name: "Christmas Day", date: "2026-12-25", type: "Public" },
];
