import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveEmploymentType, employmentLabel } from "@/lib/employment";
import { fullName } from "@/lib/utils";
import {
  buildEmployeeReportWhere,
  parseDateRange,
  type ReportFilters,
} from "@/lib/reports/scope";
import { getCompanyScope } from "@/lib/company-scope";
import { defaultOfficeName, resolveHrStatuses } from "@/lib/reports/employee-status";
import { getDistinctGenders, getEmployeeGenderMap } from "@/lib/reports/gender-fallback";

export type ChartSegment = { label: string; value: number; color: string };
export type BarPoint = { label: string; value: number; month?: string; year?: number };

const CHART_COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#3b82f6", "#ec4899", "#64748b"];

function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function ageBucket(age: number | null): string {
  if (age == null) return "Unknown";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  return "50+";
}

function tenureLabel(hireDate: Date): string {
  const ms = Date.now() - hireDate.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = days % 30;
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (remDays && !years) parts.push(`${remDays} day${remDays === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 days";
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

async function loadEmployees(session: SessionUser, filters: ReportFilters) {
  const where = await buildEmployeeReportWhere(session, filters);
  let rows = await prisma.employee.findMany({
    where,
    include: { department: true },
    orderBy: { firstName: "asc" },
  });
  if (filters.employmentType && filters.employmentType !== "ALL") {
    rows = rows.filter((e) => resolveEmploymentType(e) === filters.employmentType);
  }
  if (filters.office && filters.office !== "ALL") {
    const office = defaultOfficeName(session);
    if (filters.office !== office) rows = [];
  }
  if (filters.gender && filters.gender !== "ALL") {
    const genderMap = await getEmployeeGenderMap(rows.map((e) => e.id));
    rows = rows.filter((e) => genderMap.get(e.id) === filters.gender);
  }
  return rows;
}

export async function getHeadcountReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const hrStatuses = await resolveHrStatuses(employees);
  const office = defaultOfficeName(session);

  const deptMap = new Map<string, number>();
  for (const emp of employees) {
    const name = emp.department.name;
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
  }
  const chart: ChartSegment[] = [...deptMap.entries()].map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  let rows = employees.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    name: fullName(emp.firstName, emp.lastName),
    email: emp.email,
    employeeCode: emp.employeeCode,
    department: emp.department.name,
    employmentType: employmentLabel(resolveEmploymentType(emp)),
    office,
    jobTitle: emp.jobTitle,
    hrStatus: hrStatuses.get(emp.id) ?? "ACTIVE",
    status: emp.status,
  }));

  return { chart, rows, total: rows.length };
}

export async function getAgeProfileReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const buckets = new Map<string, number>();
  for (const emp of employees) {
    const bucket = ageBucket(ageFromDob(emp.dateOfBirth));
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const order = ["20s", "30s", "40s", "50+", "Unknown"];
  const chart: ChartSegment[] = order
    .filter((k) => buckets.has(k))
    .map((label, i) => ({
      label,
      value: buckets.get(label) ?? 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  const rows = employees.map((emp) => ({
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    employeeCode: emp.employeeCode,
    department: emp.department.name,
    jobTitle: emp.jobTitle,
    age: ageFromDob(emp.dateOfBirth),
    status: emp.status,
  }));
  return { chart, rows };
}

export async function getGenderProfileReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const genderMap = await getEmployeeGenderMap(employees.map((e) => e.id));
  const buckets = new Map<string, number>();
  for (const emp of employees) {
    const g = genderMap.get(emp.id) ?? "Unknown";
    buckets.set(g, (buckets.get(g) ?? 0) + 1);
  }
  const chart: ChartSegment[] = [...buckets.entries()].map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const rows = employees.map((emp) => ({
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    employeeCode: emp.employeeCode,
    department: emp.department.name,
    jobTitle: emp.jobTitle,
    gender: genderMap.get(emp.id) ?? "—",
    status: emp.status,
  }));
  return { chart, rows };
}

export async function getBirthdayReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const rows = employees
    .filter((e) => e.dateOfBirth)
    .map((emp) => ({
      id: emp.id,
      name: fullName(emp.firstName, emp.lastName),
      employeeCode: emp.employeeCode,
      department: emp.department.name,
      jobTitle: emp.jobTitle,
      dateOfBirth: emp.dateOfBirth!.toISOString(),
      age: ageFromDob(emp.dateOfBirth),
    }))
    .sort((a, b) => {
      const da = new Date(a.dateOfBirth);
      const db = new Date(b.dateOfBirth);
      return da.getMonth() - db.getMonth() || da.getDate() - db.getDate();
    });
  return { rows };
}

export async function getTenureReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const rows = employees.map((emp) => ({
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    employeeCode: emp.employeeCode,
    department: emp.department.name,
    jobTitle: emp.jobTitle,
    employmentType: employmentLabel(resolveEmploymentType(emp)),
    tenure: tenureLabel(emp.hireDate),
    hireDate: emp.hireDate.toISOString(),
    status: emp.status,
  }));
  return { rows };
}

export async function getTurnoverReport(session: SessionUser, filters: ReportFilters) {
  const { from, to } = parseDateRange(filters);
  const where = await buildEmployeeReportWhere(session, { ...filters, status: "ALL" });
  const employees = await prisma.employee.findMany({
    where,
    include: { department: true },
  });

  const months: BarPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const label = cursor.toLocaleString("en-US", { month: "short", year: "numeric" });
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    const activeAtStart = employees.filter(
      (e) => e.hireDate <= monthEnd && (e.status === "ACTIVE" || e.updatedAt >= monthStart)
    ).length;
    const departed = employees.filter(
      (e) =>
        e.status === "INACTIVE" &&
        e.updatedAt >= monthStart &&
        e.updatedAt <= monthEnd
    ).length;
    const rate = activeAtStart > 0 ? Math.round((departed / activeAtStart) * 1000) / 10 : 0;
    months.push({ label, value: rate, month: cursor.toLocaleString("en-US", { month: "short" }), year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const resigned = employees.filter((e) => e.status === "INACTIVE");
  const rows = resigned.map((emp) => ({
    id: emp.id,
    name: fullName(emp.firstName, emp.lastName),
    employeeCode: emp.employeeCode,
    department: emp.department.name,
    jobTitle: emp.jobTitle,
    employmentType: employmentLabel(resolveEmploymentType(emp)),
    tenure: tenureLabel(emp.hireDate),
    hireDate: emp.hireDate.toISOString(),
    resignDate: emp.updatedAt.toISOString(),
  }));
  return { chart: months, rows };
}

export async function getOnboardingReport(session: SessionUser, filters: ReportFilters) {
  const { from, to } = parseDateRange(filters);
  const scope = getCompanyScope(session);
  const empWhere = await buildEmployeeReportWhere(session, filters);
  const employeeIds = (await prisma.employee.findMany({ where: empWhere, select: { id: true } })).map(
    (e) => e.id
  );

  const instances = await prisma.checklistInstance.findMany({
    where: {
      type: "ONBOARDING",
      startDate: { gte: from, lte: to },
      employeeId: { in: employeeIds },
      ...(scope.companyId ? { companyId: scope.companyId } : {}),
    },
    include: { employee: { include: { department: true } } },
    orderBy: { startDate: "desc" },
  });

  const monthMap = new Map<string, number>();
  for (const inst of instances) {
    const key = inst.startDate.toLocaleString("en-US", { month: "short", year: "numeric" });
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const chart: BarPoint[] = [...monthMap.entries()].map(([label, value]) => ({ label, value }));

  const rows = instances.map((inst) => ({
    id: inst.id,
    name: fullName(inst.employee.firstName, inst.employee.lastName),
    employeeCode: inst.employee.employeeCode,
    department: inst.employee.department.name,
    jobTitle: inst.employee.jobTitle,
    employmentType: employmentLabel(resolveEmploymentType(inst.employee)),
    joinDate: inst.startDate.toISOString(),
    status: inst.status,
  }));
  return { chart, rows };
}

export async function getOffboardingReport(session: SessionUser, filters: ReportFilters) {
  const { from, to } = parseDateRange(filters);
  const scope = getCompanyScope(session);
  const empWhere = await buildEmployeeReportWhere(session, { ...filters, status: "ALL" });
  const employeeIds = (await prisma.employee.findMany({ where: empWhere, select: { id: true } })).map(
    (e) => e.id
  );

  const instances = await prisma.checklistInstance.findMany({
    where: {
      type: "OFFBOARDING",
      startDate: { gte: from, lte: to },
      employeeId: { in: employeeIds },
      ...(scope.companyId ? { companyId: scope.companyId } : {}),
    },
    include: { employee: { include: { department: true } } },
    orderBy: { startDate: "desc" },
  });

  const monthMap = new Map<string, number>();
  for (const inst of instances) {
    const key = inst.startDate.toLocaleString("en-US", { month: "short", year: "numeric" });
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const chart: BarPoint[] = [...monthMap.entries()].map(([label, value]) => ({ label, value }));

  const rows = instances.map((inst) => ({
    id: inst.id,
    name: fullName(inst.employee.firstName, inst.employee.lastName),
    employeeCode: inst.employee.employeeCode,
    department: inst.employee.department.name,
    jobTitle: inst.employee.jobTitle,
    resignationDate: inst.startDate.toISOString(),
    lastWorkingDate:
      inst.endDate?.toISOString() ??
      (inst.employee as { endDate?: Date | null }).endDate?.toISOString() ??
      "—",
    status: inst.status,
  }));
  return { chart, rows };
}

export async function getTimeOffBalanceReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const approved = await prisma.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          startDate: { lte: yearEnd },
          endDate: { gte: yearStart },
        },
      });
      const used = approved.reduce((sum, lr) => sum + daysBetween(lr.startDate, lr.endDate), 0);
      const pending = await prisma.leaveRequest.findMany({
        where: { employeeId: emp.id, status: "PENDING" },
      });
      const requested = pending.reduce((sum, lr) => sum + daysBetween(lr.startDate, lr.endDate), 0);
      return {
        id: emp.id,
        name: fullName(emp.firstName, emp.lastName),
        employeeCode: emp.employeeCode,
        department: emp.department.name,
        jobTitle: emp.jobTitle,
        used,
        requested,
      };
    })
  );
  return { rows };
}

export async function getTimeOffScheduleReport(session: SessionUser, filters: ReportFilters) {
  const employees = await loadEmployees(session, filters);
  const ids = employees.map((e) => e.id);
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: ids },
      status: { in: ["APPROVED", "PENDING"] },
    },
    include: { employee: true },
    orderBy: { startDate: "asc" },
  });

  const typeColors: Record<string, string> = {
    ANNUAL: "Annual",
    SICK: "Sick Leave",
    UNPAID: "Unpaid Time Off",
    MATERNITY: "Engagement",
    PATERNITY: "Engagement",
    OTHER: "Other",
  };

  const rows = leaves.map((lr) => ({
    id: lr.id,
    name: fullName(lr.employee.firstName, lr.employee.lastName),
    employeeCode: lr.employee.employeeCode,
    jobTitle: lr.employee.jobTitle,
    from: lr.startDate.toISOString(),
    to: lr.endDate.toISOString(),
    type: typeColors[lr.type] ?? lr.type,
    status: lr.employee.status,
    leaveStatus: lr.status,
  }));
  return { rows };
}

export async function getRecruitmentReport(session: SessionUser) {
  const scope = getCompanyScope(session);
  const jobs = await prisma.job.findMany({
    where: scope.companyId ? { companyId: scope.companyId } : {},
    include: {
      department: true,
      _count: { select: { applications: true } },
    },
  });

  const stageMap = new Map<string, number>();
  const apps = await prisma.jobApplication.findMany({
    where: scope.companyId
      ? { job: { companyId: scope.companyId } }
      : {},
    select: { status: true },
  });
  for (const app of apps) {
    stageMap.set(app.status, (stageMap.get(app.status) ?? 0) + 1);
  }

  const chart: ChartSegment[] = [...stageMap.entries()].map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const rows = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    department: job.department?.name ?? "—",
    status: job.status,
    applicants: job._count.applications,
    postedAt: job.createdAt.toISOString(),
  }));
  return { chart, rows };
}

export async function getReportFilterOptions(session: SessionUser) {
  const scope = getCompanyScope(session);
  const empWhere = await buildEmployeeReportWhere(session, { status: "ALL" });
  const [departments, employees, genders] = await Promise.all([
    prisma.department.findMany({
      where: scope.companyId ? { companyId: scope.companyId } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: empWhere,
      select: { jobTitle: true },
    }),
    getDistinctGenders(),
  ]);

  const jobTitles = [...new Set(employees.map((e) => e.jobTitle))].sort();
  const offices = [defaultOfficeName(session)];

  return { departments, jobTitles, genders, offices };
}
