export type PortalKind = "LETTER" | "FORM";

export type FormFieldType = "text" | "textarea" | "date" | "number" | "select" | "checkbox";

export type FormFieldDef = {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export const MERGE_FIELDS = [
  { key: "companyName", label: "Company name" },
  { key: "today", label: "Today's date" },
  { key: "employeeName", label: "Employee full name" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "employeeCode", label: "Employee code" },
  { key: "jobTitle", label: "Job title" },
  { key: "department", label: "Department" },
  { key: "branch", label: "Branch" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "hireDate", label: "Hire date" },
  { key: "salary", label: "Salary" },
  { key: "address", label: "Address" },
  { key: "managerName", label: "Manager name" },
  { key: "employmentType", label: "Employment type" },
] as const;

export const LETTER_CATEGORIES = [
  { id: "OFFER", label: "Offer letter" },
  { id: "APPOINTMENT", label: "Appointment" },
  { id: "CONFIRMATION", label: "Confirmation" },
  { id: "EXPERIENCE", label: "Experience / service" },
  { id: "SALARY", label: "Salary certificate" },
  { id: "PROMOTION", label: "Promotion" },
  { id: "TRANSFER", label: "Transfer" },
  { id: "WARNING", label: "Warning" },
  { id: "QUERY", label: "Query" },
  { id: "RELIEVING", label: "Relieving" },
  { id: "REFERENCE", label: "Reference" },
  { id: "CUSTOM", label: "Custom letter" },
] as const;

export const FORM_CATEGORIES = [
  { id: "EMPLOYEE_INFO", label: "Employee information" },
  { id: "LEAVE_APPLICATION", label: "Leave application" },
  { id: "BANK_DETAILS", label: "Bank details" },
  { id: "EMERGENCY_CONTACT", label: "Emergency contact" },
  { id: "ASSET_REQUEST", label: "Asset request" },
  { id: "ID_CARD", label: "ID card request" },
  { id: "TRAINING", label: "Training request" },
  { id: "GRIEVANCE", label: "Complaint / grievance" },
  { id: "CUSTOM", label: "Custom form" },
] as const;

export function categoryLabel(kind: string, category: string) {
  const list = kind === "FORM" ? FORM_CATEGORIES : LETTER_CATEGORIES;
  return list.find((c) => c.id === category)?.label ?? category;
}

export function parseFieldsJson(raw: string | null | undefined): FormFieldDef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FormFieldDef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFieldValues(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function newFieldId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
