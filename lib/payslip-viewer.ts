import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  canManagePayroll,
  isCompanyAdmin,
  isHrRole,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/roles";
import { fullName } from "@/lib/utils";

export type PayslipViewerContext = {
  role: Role;
  isOwnPayslip: boolean;
  canManage: boolean;
  isPayrollAdmin: boolean;
  pageTitle: string;
  pageDescription: string;
  backLabel: string;
  receiptKind: string;
  documentSubtitle: string;
  payeeLabel: string;
  showEmployeeProfileLink: boolean;
  showProcessingNotice: boolean;
  downloadLabel: string;
};

export function getPayslipViewerContext(
  session: SessionUser,
  record: { employee: { id: string; firstName: string; lastName: string } },
  canManage: boolean
): PayslipViewerContext {
  const role = normalizeRole(session.role);
  const isOwnPayslip = session.employeeId === record.employee.id;
  const employeeName = fullName(record.employee.firstName, record.employee.lastName);
  const isPayrollAdmin =
    canManagePayroll(role) || isSuperAdmin(role) || isCompanyAdmin(role) || isHrRole(role);

  const base = {
    role,
    isOwnPayslip,
    canManage,
    isPayrollAdmin,
    showEmployeeProfileLink: false,
    showProcessingNotice: false,
    downloadLabel: "Download",
  };

  if (isOwnPayslip && role === "EMPLOYEE") {
    return {
      ...base,
      pageTitle: "My payslip",
      pageDescription: "Your earnings, deductions, and net pay for this period",
      backLabel: "Back to my payslips",
      receiptKind: "Your salary receipt",
      documentSubtitle: "Personal payslip — retain for your records",
      payeeLabel: "You",
      showProcessingNotice: true,
      downloadLabel: "Download payslip",
    };
  }

  if (isOwnPayslip) {
    return {
      ...base,
      pageTitle: "My payslip",
      pageDescription: "Your earnings breakdown and net pay",
      backLabel: "Back to payroll",
      receiptKind: "Your salary receipt",
      documentSubtitle: "Personal payslip",
      payeeLabel: "You",
      showProcessingNotice: true,
      downloadLabel: "Download payslip",
    };
  }

  if (role === "MANAGER") {
    return {
      ...base,
      pageTitle: "Team payslip",
      pageDescription: `Preview payslip breakdown for ${employeeName}`,
      backLabel: "Back to team payroll",
      receiptKind: "Team member payslip",
      documentSubtitle: "Manager preview — view and download only; contact HR to edit",
      payeeLabel: employeeName,
      showEmployeeProfileLink: true,
      downloadLabel: "Download payslip",
    };
  }

  if (role === "SUPERVISOR") {
    return {
      ...base,
      pageTitle: "Team payslip",
      pageDescription: `View-only payslip for ${employeeName}`,
      backLabel: "Back to payroll",
      receiptKind: "Team member payslip",
      documentSubtitle: "Supervisor view — read-only access",
      payeeLabel: employeeName,
      showEmployeeProfileLink: true,
      downloadLabel: "Download payslip",
    };
  }

  return {
    ...base,
    isPayrollAdmin: true,
    pageTitle: "Payroll record",
    pageDescription: `Full payslip breakdown for ${employeeName}`,
    backLabel: "Back to payroll",
    receiptKind: "Payroll invoice",
    documentSubtitle: isPayrollAdmin
      ? "HR / admin record — edit breakdown, status, and notes"
      : "Administrative payroll record",
    payeeLabel: employeeName,
    showEmployeeProfileLink: true,
    downloadLabel: "Download invoice",
  };
}

export function payslipStatusNotice(
  status: string,
  context: PayslipViewerContext
): string | null {
  if (!context.showProcessingNotice) return null;
  if (status === "PAID") return null;
  if (status === "DRAFT") {
    return "This payslip is still being prepared. Amounts may change before payment.";
  }
  if (status === "PROCESSED") {
    return "This payslip has been processed and is awaiting payment.";
  }
  return null;
}
