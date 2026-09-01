import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, isPortalTemplateModelReady } from "@/lib/prisma";
import { requireSession, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-auth";
import {
  getCompanyScope,
  employeeCompanyWhere,
  portalTemplateCompanyWhere,
  requireOrgCompanyId,
} from "@/lib/company-scope";
import { canManageLetters } from "@/lib/letters/access";
import { parseFieldValues, parseFieldsJson } from "@/lib/letters/fields";
import { buildMergeValues, renderLetterBody } from "@/lib/letters/render";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!canManageLetters(session)) return forbidden();
  if (!isPortalTemplateModelReady()) {
    return NextResponse.json({ error: "Letters & forms are not ready." }, { status: 503 });
  }

  const body = await request.json();
  const templateId = String(body.templateId ?? "");
  const employeeIds = Array.isArray(body.employeeIds)
    ? body.employeeIds.filter((id: unknown) => typeof id === "string")
    : [];
  const extras = parseFieldValues(JSON.stringify(body.extras ?? {}));
  const employeeOverrides =
    body.employeeOverrides && typeof body.employeeOverrides === "object"
      ? (body.employeeOverrides as Record<string, Record<string, unknown>>)
      : {};

  if (!templateId) return badRequest("templateId is required");
  if (employeeIds.length === 0) return badRequest("Select at least one employee");

  const scope = getCompanyScope(session);
  const template = await prisma.portalTemplate.findFirst({
    where: { id: templateId, ...portalTemplateCompanyWhere(scope) },
  });
  if (!template) return notFound();
  if (!template.isPublished) return badRequest("Publish the template before issuing it");
  if (template.kind === "LETTER") {
    const missingField = parseFieldsJson(template.fieldsJson).find(
      (field) => field.required && !extras[field.id]?.trim()
    );
    if (missingField) return badRequest(`${missingField.label} is required before issuing`);
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, ...employeeCompanyWhere(scope) },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      jobTitle: true,
      email: true,
      phone: true,
      hireDate: true,
      salary: true,
      address: true,
      employmentType: true,
      department: { select: { name: true } },
      branch: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });
  if (employees.length === 0) return badRequest("No matching employees");
  const employeeUpdates = employees.map((employee) => {
      const override = employeeOverrides[employee.id] ?? {};
      const jobTitle = typeof override.jobTitle === "string" ? override.jobTitle.trim() : employee.jobTitle;
      const address = typeof override.address === "string" ? override.address.trim() : employee.address;
      const salaryValue = typeof override.salary === "string" || typeof override.salary === "number"
        ? Number(override.salary)
        : employee.salary;
      const salary = Number.isFinite(salaryValue) ? salaryValue : employee.salary;
      const changes = {
        ...(jobTitle !== employee.jobTitle ? { jobTitle } : {}),
        ...(address !== employee.address ? { address } : {}),
        ...(salary !== employee.salary ? { salary } : {}),
      };
      return { employee, changes, preview: { ...employee, jobTitle, address, salary } };
    });
  if (template.category === "OFFER") {
    const incomplete = employeeUpdates.find(
      ({ preview }) => !preview.address?.trim() || !preview.jobTitle?.trim() || preview.salary <= 0
    );
    if (incomplete) {
      return badRequest(
        `${incomplete.employee.firstName} ${incomplete.employee.lastName} needs an address, job title, and salary before an offer letter can be issued`
      );
    }
  }
  const preparedEmployees = await Promise.all(
    employeeUpdates.map(({ employee, changes }) => {
      if (Object.keys(changes).length === 0) return employee;
      return prisma.employee.update({
        where: { id: employee.id },
        data: changes,
        select: {
          id: true, userId: true, firstName: true, lastName: true, employeeCode: true,
          jobTitle: true, email: true, phone: true, hireDate: true, salary: true, address: true,
          employmentType: true, department: { select: { name: true } },
          branch: { select: { name: true } }, manager: { select: { firstName: true, lastName: true } },
        },
      });
    })
  );

  const company = session.companyId
    ? await prisma.company.findUnique({ where: { id: session.companyId }, select: { name: true } })
    : null;
  const currencyCode = await getAppCurrencyCode();
  const issuedByName = `${session.firstName ?? "HR"} ${session.lastName ?? ""}`.trim();
  const companyId = requireOrgCompanyId(scope);
  const status = template.kind === "FORM" ? "PENDING" : "ISSUED";

  const created = [];
  for (const employee of preparedEmployees) {
    const values = buildMergeValues({
      companyName: company?.name ?? "Company",
      currencyCode,
      employee,
      extras,
    });
    const rendered = renderLetterBody(template.body, values);
    const doc = await prisma.portalDocument.create({
      data: {
        companyId,
        templateId: template.id,
        employeeId: employee.id,
        kind: template.kind,
        title: template.title,
        body: rendered,
        fieldValuesJson: JSON.stringify(extras),
        status,
        issuedByName,
        issuedAt: new Date(),
      },
    });
    created.push(doc);

    if (employee.userId) {
      await createNotification({
        userId: employee.userId,
        type: "general",
        title: template.kind === "FORM" ? "Form to complete" : "New letter issued",
        message: template.title,
        href: `/letters/documents/${doc.id}`,
      });
    }
  }

  broadcastAppEvent("letter_updated", { templateId, action: "issued", count: created.length });
  revalidatePath("/letters");
  revalidatePath(`/letters/${templateId}`);
  return NextResponse.json({ created: created.length, ids: created.map((d) => d.id) });
}
