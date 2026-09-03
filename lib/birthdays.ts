import { prisma, isNotificationModelReady, isPortalTemplateModelReady } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { deliverMail, emailFromAddress, isEmailConfigured } from "@/lib/email";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { formatDate } from "@/lib/utils";
import { buildMergeValues, renderLetterBody } from "@/lib/letters/render";

/**
 * Run birthday celebrations for every company in the system. Used by the
 * instrumentation scheduler and the cron endpoint.
 */
export async function runBirthdayCelebrationsForAllCompanies(on?: Date) {
  const companies = await prisma.company.findMany({ select: { id: true } });
  const summary = { celebrated: 0, notifiedColleagues: 0 };
  for (const company of companies) {
    try {
      const r = await runBirthdayCelebrations(company.id, on);
      summary.celebrated += r.celebrated;
      summary.notifiedColleagues += r.notifiedColleagues;
    } catch {
      // best-effort; a single company failure shouldn't stop the rest
    }
  }
  return summary;
}

/**
 * Immediately celebrate a single newly-created employee if their birthday is today.
 * Used so creating a birthday celebrant triggers the real-time email/letter/notifications
 * right away, rather than waiting for the daily cron. Safe no-op otherwise.
 */
export async function celebrateNewEmployee(input: {
  companyId?: string | null;
  employeeId: string;
}) {
  if (!input.companyId) return;
  const celebrants = await findBirthdayCelebrants(input.companyId);
  const celebrant = celebrants.find((c) => c.id === input.employeeId);
  if (!celebrant) return;

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { name: true },
  });
  const companyName = company?.name ?? "Company";
  const currency = await getAppCurrencyCode().catch(() => "");
  await celebrateOne(input.companyId, celebrant, companyName, isEmailConfigured(), currency);
}

const BIRTHDAY_LETTER_BODY = `{{today}}

{{employeeName}}

Dear {{firstName}},

HAPPY BIRTHDAY!

On behalf of everyone at {{companyName}}, we would like to take this opportunity to wish you a very happy birthday. We truly appreciate your hard work, dedication, and the positive energy you bring to the team every day.

May your day be filled with joy, and may the year ahead bring you success, good health, and happiness both personally and professionally.

Thank you for being a valued member of our team.

Warm regards,
Human Resources
{{companyName}}`;

type BirthdayCelebrant = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;
  jobTitle: string;
  phone: string | null;
  hireDate: Date;
  salary: number;
  address: string | null;
  employmentType: string;
  dateOfBirth: Date;
  department: { name: string } | null;
  branch: { name: string } | null;
  manager: { firstName: string; lastName: string } | null;
};

/**
 * Find all active employees whose birthday falls on the given date.
 * Compares month/day independent of year so it works correctly regardless
 * of how the dateOfBirth was normalized to a DateTime.
 */
export async function findBirthdayCelebrants(
  companyId: string,
  on?: Date
): Promise<BirthdayCelebrant[]> {
  const day = on ?? new Date();
  const month = day.getUTCMonth() + 1;
  const date = day.getUTCDate();

  const employees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      dateOfBirth: { not: null },
      user: { companyId },
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      employeeCode: true,
      jobTitle: true,
      phone: true,
      hireDate: true,
      salary: true,
      address: true,
      employmentType: true,
      dateOfBirth: true,
      department: { select: { name: true } },
      branch: { select: { name: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  return employees.flatMap((e) => {
    if (!e.dateOfBirth) return [];
    const b = e.dateOfBirth;
    if (!(b.getUTCMonth() + 1 === month && b.getUTCDate() === date)) return [];
    return [{ ...e, dateOfBirth: b }];
  });
}

function mergeValuesFor(celebrant: BirthdayCelebrant, companyName: string, currencyCode: string) {
  return buildMergeValues({
    companyName,
    currencyCode,
    employee: {
      firstName: celebrant.firstName,
      lastName: celebrant.lastName,
      employeeCode: celebrant.employeeCode,
      jobTitle: celebrant.jobTitle,
      email: celebrant.email,
      phone: celebrant.phone,
      hireDate: celebrant.hireDate,
      salary: celebrant.salary,
      address: celebrant.address,
      employmentType: celebrant.employmentType,
      department: celebrant.department,
      branch: celebrant.branch,
      manager: celebrant.manager,
    },
  });
}

/**
 * Run the birthday flow for a single company.
 *   - Celebrant: receives an in-app birthday letter (PortalDocument) + a notification,
 *     and an email if SMTP is configured.
 *   - Everyone else in the company: receives a notification celebrating the staff member.
 * Real-time delivery is handled automatically via broadcastAppEvent inside createNotification.
 */
export async function runBirthdayCelebrations(companyId: string, on?: Date) {
  const celebrants = await findBirthdayCelebrants(companyId, on);
  if (celebrants.length === 0) return { celebrated: 0, notifiedColleagues: 0 };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  const companyName = company?.name ?? "Company";
  const emailConfigured = isEmailConfigured();
  const currency = await getAppCurrencyCode().catch(() => "");

  let celebrated = 0;
  let notifiedColleagues = 0;

  for (const celebrant of celebrants) {
    await celebrateOne(companyId, celebrant, companyName, emailConfigured, currency);
    celebrated += 1;
    if (celebrant.userId) notifiedColleagues += 1;
  }

  return { celebrated, notifiedColleagues };
}

async function celebrateOne(
  companyId: string,
  celebrant: BirthdayCelebrant,
  companyName: string,
  emailConfigured: boolean,
  currency: string
) {
  const docId = await issueBirthdayLetter(companyId, celebrant, companyName, currency);

  if (celebrant.userId) {
    await createNotification({
      userId: celebrant.userId,
      type: "general",
      title: "Happy Birthday! 🎉",
      message: `We're celebrating your birthday today. A special letter from ${companyName} is waiting for you.`,
      href: docId ? `/letters/documents/${docId}` : `/reports/employee-data/birthday`,
    });
  }

  if (emailConfigured && celebrant.email) {
    try {
      await deliverMail({
        from: emailFromAddress(),
        to: celebrant.email,
        subject: `Happy Birthday, ${celebrant.firstName}! 🎂`,
        html: birthdayEmailHtml(celebrant, companyName),
        text: renderLetterBody(
          BIRTHDAY_LETTER_BODY,
          mergeValuesFor(celebrant, companyName, currency)
        ),
      });
    } catch {
      // best-effort; ignore email failures
    }
  }

  if (celebrant.userId) {
    await notifyColleagues(companyId, celebrant, celebrant.userId);
  }
}

async function issueBirthdayLetter(
  companyId: string,
  celebrant: BirthdayCelebrant,
  companyName: string,
  currencyCode: string
): Promise<string | null> {
  if (!isPortalTemplateModelReady()) return null;
  const values = mergeValuesFor(celebrant, companyName, currencyCode);
  const body = renderLetterBody(BIRTHDAY_LETTER_BODY, values);

  const doc = await prisma.portalDocument.create({
    data: {
      companyId,
      employeeId: celebrant.id,
      kind: "LETTER",
      title: "Birthday wishes",
      body,
      fieldValuesJson: "{}",
      status: "ISSUED",
      issuedByName: companyName,
      issuedAt: new Date(),
    },
  });
  return doc.id;
}

async function notifyColleagues(
  companyId: string,
  celebrant: BirthdayCelebrant,
  celebrantUserId: string
) {
  if (!isNotificationModelReady()) return;
  const name = `${celebrant.firstName} ${celebrant.lastName}`;
  const colleagueUsers = await prisma.user.findMany({
    where: {
      companyId,
      id: { not: celebrantUserId },
    },
    select: { id: true, preferences: true },
  });

  for (const user of colleagueUsers) {
    await createNotification({
      userId: user.id,
      type: "general",
      title: `🎉 ${name} is celebrating a birthday`,
      message: `Wish ${celebrant.firstName} a happy birthday today!`,
      href: "/reports/employee-data/birthday",
    });
  }
}

function birthdayEmailHtml(celebrant: BirthdayCelebrant, companyName: string): string {
  const today = formatDate(new Date());
  return `<div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #eee;border-radius:12px;max-width:560px">
  <h1 style="margin:0 0 8px;color:#111">Happy Birthday, ${celebrant.firstName}! 🎉</h1>
  <p style="color:#555;margin:0 0 16px">${today}</p>
  <p style="color:#333">On behalf of everyone at <strong>${companyName}</strong>, we'd like to wish you a very happy birthday. We appreciate your hard work and the energy you bring to the team.</p>
  <p style="color:#333">May your day be filled with joy, and the year ahead bring success, good health, and happiness.</p>
  <p style="color:#333;margin-top:16px">Best regards,<br/>Human Resources<br/><strong>${companyName}</strong></p>
</div>`;
}