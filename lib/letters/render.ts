import { formatCurrency, formatDate } from "@/lib/utils";
import { MERGE_FIELDS } from "@/lib/letters/fields";

export type MergeEmployee = {
  firstName: string;
  lastName: string;
  employeeCode: string;
  jobTitle: string;
  email: string;
  phone: string | null;
  hireDate: Date | string;
  salary: number;
  address: string | null;
  employmentType: string;
  department?: { name: string } | null;
  branch?: { name: string } | null;
  manager?: { firstName: string; lastName: string } | null;
};

export type MergeContext = {
  companyName: string;
  currencyCode?: string;
  employee?: MergeEmployee | null;
  extras?: Record<string, string>;
};

function money(amount: number, currencyCode?: string) {
  return formatCurrency(amount, currencyCode);
}

export function buildMergeValues(ctx: MergeContext): Record<string, string> {
  const emp = ctx.employee;
  const values: Record<string, string> = {
    companyName: ctx.companyName,
    today: formatDate(new Date()),
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "",
    firstName: emp?.firstName ?? "",
    lastName: emp?.lastName ?? "",
    employeeCode: emp?.employeeCode ?? "",
    jobTitle: emp?.jobTitle ?? "",
    department: emp?.department?.name ?? "",
    branch: emp?.branch?.name ?? "",
    email: emp?.email ?? "",
    phone: emp?.phone ?? "",
    hireDate: emp?.hireDate ? formatDate(emp.hireDate) : "",
    salary: emp ? money(emp.salary, ctx.currencyCode) : "",
    address: emp?.address ?? "",
    managerName: emp?.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : "",
    employmentType: emp?.employmentType?.replace(/_/g, " ") ?? "",
    ...ctx.extras,
  };
  return values;
}

export function renderLetterBody(body: string, values: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    return value != null && value !== "" ? value : `{{${key}}}`;
  });
}

export function unusedMergeKeys(body: string) {
  const used = new Set(
    [...body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1])
  );
  return MERGE_FIELDS.filter((f) => !used.has(f.key));
}
