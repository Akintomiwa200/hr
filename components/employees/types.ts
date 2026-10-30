import type { Department, Employee, Role } from "@prisma/client";

export type EmployeeRow = Employee & {
  endDate?: Date | string | null;
  department: Department;
  branch?: { id: string; name: string; location?: string | null } | null;
  user?: {
    role: Role;
    suspendedAt?: Date | string | null;
    suspendedUntil?: Date | string | null;
    suspensionReason?: string | null;
    archivedAt?: Date | string | null;
    isActive?: boolean;
  } | null;
  manager?: { id: string; firstName: string; lastName: string } | null;
  managers?: { id: string; firstName: string; lastName: string }[];
};

export type DepartmentOption = { id: string; name: string };
export type BranchOption = { id: string; name: string; location?: string };
export type ManagerOption = { id: string; firstName: string; lastName: string };

export type EmployeeFormData = {
  employeeCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  departmentId: string;
  branchId: string;
  biometricPin: string;
  isShiftWorker: boolean;
  shiftStartTime: string;
  managerId: string;
  managerIds: string[];
  employmentType: "FULL_TIME" | "FREELANCE";
  role: Role;
  salary: string;
  bankName: string;
  accountNumber: string;
  nin: string;
  status: string;
  address: string;
  hireDate: string;
  endDate: string;
  dateOfBirth: string;
};
