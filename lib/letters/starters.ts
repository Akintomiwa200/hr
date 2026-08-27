import type { FormFieldDef } from "@/lib/letters/fields";

export type StarterTemplate = {
  kind: "LETTER" | "FORM";
  category: string;
  title: string;
  description: string;
  body: string;
  fields: FormFieldDef[];
};

const letterFields = (
  extras: { id: string; label: string; type?: FormFieldDef["type"]; required?: boolean }[]
): FormFieldDef[] =>
  extras.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type ?? "text",
    required: f.required ?? false,
  }));

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    kind: "LETTER",
    category: "OFFER",
    title: "Offer letter",
    description: "Formal employment offer with role, start date, and salary.",
    body: `{{today}}

{{employeeName}}
{{address}}

Dear {{firstName}},

We are pleased to offer you the position of {{jobTitle}} in the {{department}} department at {{companyName}}, reporting to {{managerName}}.

Your employment will commence on {{startDate}} on a {{employmentType}} basis. Your gross compensation will be {{salary}} per annum.

Please sign and return this letter to confirm your acceptance. We look forward to welcoming you to the team.

Yours sincerely,
Human Resources
{{companyName}}`,
    fields: letterFields([
      { id: "startDate", label: "Start date", type: "date", required: true },
    ]),
  },
  {
    kind: "LETTER",
    category: "APPOINTMENT",
    title: "Appointment letter",
    description: "Confirms appointment after an offer is accepted.",
    body: `{{today}}

{{employeeName}}
Employee code: {{employeeCode}}

Dear {{firstName}},

This letter confirms your appointment as {{jobTitle}} in {{department}} at {{companyName}}, effective {{effectiveDate}}.

You will be based at {{branch}} and report to {{managerName}}. Please complete all onboarding requirements before your start date.

Yours sincerely,
Human Resources
{{companyName}}`,
    fields: letterFields([{ id: "effectiveDate", label: "Effective date", type: "date", required: true }]),
  },
  {
    kind: "LETTER",
    category: "CONFIRMATION",
    title: "Employment confirmation",
    description: "Confirms that a person is a current employee.",
    body: `{{today}}

TO WHOM IT MAY CONCERN

This is to confirm that {{employeeName}} ({{employeeCode}}) is employed by {{companyName}} as {{jobTitle}} in the {{department}} department.

Date of hire: {{hireDate}}
Employment type: {{employmentType}}
Current status: Active

This letter is issued at the employee's request for official purposes.

Human Resources
{{companyName}}`,
    fields: [],
  },
  {
    kind: "LETTER",
    category: "EXPERIENCE",
    title: "Experience / service letter",
    description: "Records service period and role for former or current staff.",
    body: `{{today}}

TO WHOM IT MAY CONCERN

This is to certify that {{employeeName}} was employed by {{companyName}} as {{jobTitle}} in {{department}} from {{hireDate}} to {{endDate}}.

During this period, {{firstName}} performed assigned duties with professionalism. We wish {{firstName}} success in future endeavours.

Human Resources
{{companyName}}`,
    fields: letterFields([{ id: "endDate", label: "End date", type: "date" }]),
  },
  {
    kind: "LETTER",
    category: "SALARY",
    title: "Salary certificate",
    description: "Confirms current compensation for banks or visas.",
    body: `{{today}}

TO WHOM IT MAY CONCERN

This is to certify that {{employeeName}} ({{employeeCode}}) is employed by {{companyName}} as {{jobTitle}}.

Gross annual salary: {{salary}}
Date of hire: {{hireDate}}
Department: {{department}}

This certificate is issued on request and is valid as of the date above.

Human Resources
{{companyName}}`,
    fields: [],
  },
  {
    kind: "LETTER",
    category: "PROMOTION",
    title: "Promotion letter",
    description: "Notifies an employee of a new role and effective date.",
    body: `{{today}}

{{employeeName}}
{{jobTitle}} — {{department}}

Dear {{firstName}},

We are pleased to confirm your promotion to {{newTitle}}, effective {{effectiveDate}}. Your new reporting line is {{managerName}}.

Your revised compensation is {{newSalary}}. Please continue the high standard of work that earned this recognition.

Congratulations.

Human Resources
{{companyName}}`,
    fields: letterFields([
      { id: "newTitle", label: "New job title", required: true },
      { id: "effectiveDate", label: "Effective date", type: "date", required: true },
      { id: "newSalary", label: "New salary" },
    ]),
  },
  {
    kind: "LETTER",
    category: "TRANSFER",
    title: "Transfer letter",
    description: "Moves an employee to another department or location.",
    body: `{{today}}

{{employeeName}}
{{employeeCode}}

Dear {{firstName}},

This letter confirms your transfer to {{newDepartment}} at {{newLocation}}, effective {{effectiveDate}}. Your role will be {{newTitle}}, reporting to {{managerName}}.

Please complete any handover with your current team before the effective date.

Human Resources
{{companyName}}`,
    fields: letterFields([
      { id: "newDepartment", label: "New department", required: true },
      { id: "newLocation", label: "New location / branch" },
      { id: "newTitle", label: "New job title" },
      { id: "effectiveDate", label: "Effective date", type: "date", required: true },
    ]),
  },
  {
    kind: "LETTER",
    category: "WARNING",
    title: "Warning letter",
    description: "Formal written warning for conduct or performance.",
    body: `{{today}}

{{employeeName}}
{{jobTitle}} — {{department}}

Dear {{firstName}},

This is a formal written warning regarding {{reason}}.

The expected standard is {{expectation}}. Please correct this immediately. Failure to improve may result in further disciplinary action, up to and including termination.

You may discuss this letter with Human Resources.

Human Resources
{{companyName}}`,
    fields: letterFields([
      { id: "reason", label: "Reason", type: "textarea", required: true },
      { id: "expectation", label: "Expected standard", type: "textarea" },
    ]),
  },
  {
    kind: "LETTER",
    category: "QUERY",
    title: "Query letter",
    description: "Asks the employee to explain an incident in writing.",
    body: `{{today}}

{{employeeName}}
{{employeeCode}}

Dear {{firstName}},

You are required to explain in writing the incident described below, on or before {{dueDate}}:

{{incident}}

Submit your response to Human Resources. Failure to respond may lead to a decision based on available information.

Human Resources
{{companyName}}`,
    fields: letterFields([
      { id: "incident", label: "Incident", type: "textarea", required: true },
      { id: "dueDate", label: "Response due date", type: "date", required: true },
    ]),
  },
  {
    kind: "LETTER",
    category: "RELIEVING",
    title: "Relieving letter",
    description: "Confirms last working day and clearance.",
    body: `{{today}}

{{employeeName}}
{{employeeCode}}

Dear {{firstName}},

This letter confirms that you have been relieved from your duties as {{jobTitle}} at {{companyName}} with effect from {{lastDay}}.

All company property and access should already have been returned. We thank you for your service.

Human Resources
{{companyName}}`,
    fields: letterFields([{ id: "lastDay", label: "Last working day", type: "date", required: true }]),
  },
  {
    kind: "LETTER",
    category: "REFERENCE",
    title: "Reference letter",
    description: "Professional reference for a current or former employee.",
    body: `{{today}}

TO WHOM IT MAY CONCERN

{{employeeName}} was employed by {{companyName}} as {{jobTitle}} in {{department}} from {{hireDate}}.

{{firstName}} is a reliable professional. Please contact Human Resources if you need further information.

Human Resources
{{companyName}}`,
    fields: [],
  },
  {
    kind: "FORM",
    category: "EMPLOYEE_INFO",
    title: "Employee information update",
    description: "Collect updated personal and contact details.",
    body: "Please review and update your personal information. HR will use this to keep your employee record current.",
    fields: [
      { id: "phone", label: "Phone", type: "text", required: true },
      { id: "address", label: "Residential address", type: "textarea", required: true },
      { id: "emergencyName", label: "Emergency contact name", type: "text", required: true },
      { id: "emergencyPhone", label: "Emergency contact phone", type: "text", required: true },
    ],
  },
  {
    kind: "FORM",
    category: "LEAVE_APPLICATION",
    title: "Leave application form",
    description: "Request time off with dates and reason.",
    body: "Complete this form to request leave. Your manager and HR will review it.",
    fields: [
      { id: "leaveType", label: "Leave type", type: "select", required: true, options: ["Annual", "Sick", "Personal", "Maternity", "Paternity", "Unpaid"] },
      { id: "startDate", label: "Start date", type: "date", required: true },
      { id: "endDate", label: "End date", type: "date", required: true },
      { id: "reason", label: "Reason", type: "textarea", required: true },
    ],
  },
  {
    kind: "FORM",
    category: "BANK_DETAILS",
    title: "Bank details form",
    description: "Payroll bank account information.",
    body: "Provide the account that should receive your salary. Incorrect details can delay payment.",
    fields: [
      { id: "bankName", label: "Bank name", type: "text", required: true },
      { id: "accountName", label: "Account name", type: "text", required: true },
      { id: "accountNumber", label: "Account number", type: "text", required: true },
      { id: "sortCode", label: "Sort / SWIFT code", type: "text" },
    ],
  },
  {
    kind: "FORM",
    category: "EMERGENCY_CONTACT",
    title: "Emergency contact form",
    description: "Who to call in an emergency.",
    body: "List people we may contact if there is an emergency at work.",
    fields: [
      { id: "name", label: "Contact name", type: "text", required: true },
      { id: "relationship", label: "Relationship", type: "text", required: true },
      { id: "phone", label: "Phone", type: "text", required: true },
      { id: "altPhone", label: "Alternate phone", type: "text" },
    ],
  },
  {
    kind: "FORM",
    category: "ASSET_REQUEST",
    title: "Asset request form",
    description: "Request a laptop, phone, or other equipment.",
    body: "Describe the equipment you need and why. IT / Admin will review the request.",
    fields: [
      { id: "assetType", label: "Asset type", type: "select", required: true, options: ["Laptop", "Phone", "Monitor", "Access card", "Other"] },
      { id: "justification", label: "Justification", type: "textarea", required: true },
      { id: "neededBy", label: "Needed by", type: "date" },
    ],
  },
  {
    kind: "FORM",
    category: "ID_CARD",
    title: "ID card request",
    description: "Request a new or replacement staff ID.",
    body: "Request a staff identity card. Replacement cards may require a note if the original was lost.",
    fields: [
      { id: "requestType", label: "Request type", type: "select", required: true, options: ["New", "Replacement", "Renewal"] },
      { id: "reason", label: "Reason", type: "textarea", required: true },
    ],
  },
  {
    kind: "FORM",
    category: "TRAINING",
    title: "Training request form",
    description: "Ask to attend a course or conference.",
    body: "Submit this form for manager and HR approval before booking any training.",
    fields: [
      { id: "courseName", label: "Course / event name", type: "text", required: true },
      { id: "provider", label: "Provider", type: "text" },
      { id: "dates", label: "Dates", type: "text", required: true },
      { id: "cost", label: "Estimated cost", type: "text" },
      { id: "benefit", label: "How this helps your role", type: "textarea", required: true },
    ],
  },
  {
    kind: "FORM",
    category: "GRIEVANCE",
    title: "Complaint / grievance form",
    description: "Raise a workplace concern confidentially with HR.",
    body: "Describe what happened. HR will treat this as confidential and follow up with you.",
    fields: [
      { id: "incidentDate", label: "Date of incident", type: "date", required: true },
      { id: "peopleInvolved", label: "People involved", type: "text" },
      { id: "details", label: "What happened", type: "textarea", required: true },
      { id: "desiredOutcome", label: "Desired outcome", type: "textarea" },
    ],
  },
];
