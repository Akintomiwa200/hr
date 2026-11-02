import {
  prisma,
  isBirthdayWishModelReady,
  isNotificationModelReady,
  isPortalTemplateModelReady,
} from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { deliverMail, emailFromAddress, isEmailConfigured } from "@/lib/email";
import { getAppCurrencyCode } from "@/lib/currency-server";
import { getAppUrl } from "@/lib/constants/auth";
import { formatDate } from "@/lib/utils";
import { buildMergeValues, renderLetterBody } from "@/lib/letters/render";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

/** Normalise a date to midnight UTC so birthday comparisons ignore time-of-day. */
export function startOfUtcDay(value: Date = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/**
 * The date a birthday falls on in a given year. Feb 29 is celebrated on Feb 28
 * in non-leap years so leap-day employees still get a greeting every year.
 */
export function birthdayOnForYear(dateOfBirth: Date, year: number) {
  const month = dateOfBirth.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(dateOfBirth.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day));
}

/** The next occurrence of a birthday, including today when it is their day. */
export function nextBirthdayOn(dateOfBirth: Date, from: Date = new Date()) {
  const today = startOfUtcDay(from);
  let occurrence = birthdayOnForYear(dateOfBirth, today.getUTCFullYear());
  if (occurrence.getTime() < today.getTime()) {
    occurrence = birthdayOnForYear(dateOfBirth, today.getUTCFullYear() + 1);
  }
  return occurrence;
}

export function isBirthdayToday(dateOfBirth: Date, on: Date = new Date()) {
  const today = startOfUtcDay(on);
  return birthdayOnForYear(dateOfBirth, today.getUTCFullYear()).getTime() === today.getTime();
}

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
    if (!isBirthdayToday(e.dateOfBirth, day)) return [];
    return [{ ...e, dateOfBirth: e.dateOfBirth }];
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
    const result = await celebrateOne(companyId, celebrant, companyName, emailConfigured, currency);
    celebrated += 1;
    notifiedColleagues += result.notifiedColleagues;
  }

  if (celebrated > 0) {
    broadcastAppEvent("birthday_updated", { companyId });
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
  const birthdayOn = birthdayOnForYear(celebrant.dateOfBirth, new Date().getUTCFullYear());
  const existingDocId = await findTodaysBirthdayLetter(celebrant.id);
  const celebrantAlreadyNotified = celebrant.userId
    ? await hasNotificationToday(celebrant.userId, "Happy Birthday! 🎉")
    : false;
  const docId = existingDocId ?? (await issueBirthdayLetter(companyId, celebrant, companyName, currency));
  const wishCount = await countWishesFor(celebrant.id, birthdayOn);

  if (celebrant.userId && !celebrantAlreadyNotified) {
    await createNotification({
      userId: celebrant.userId,
      type: "birthday",
      title: "Happy Birthday! 🎉",
      message: `We're celebrating your birthday today. A special letter from ${companyName} is waiting for you${
        wishCount > 0 ? `, along with ${wishCount} wish${wishCount === 1 ? "" : "es"} from your colleagues` : ""
      }.`,
      href: "/birthdays",
    });
  }

  if (emailConfigured && celebrant.email && !existingDocId && !celebrantAlreadyNotified) {
    try {
      await deliverMail({
        from: emailFromAddress(),
        to: celebrant.email,
        subject: `Happy Birthday, ${celebrant.firstName}! 🎂`,
        html: birthdayEmailHtml(celebrant, companyName, wishCount),
        text: [
          renderLetterBody(
            BIRTHDAY_LETTER_BODY,
            mergeValuesFor(celebrant, companyName, currency)
          ),
          "",
          "See the birthday wishes from your colleagues:",
          `${getAppUrl()}/birthdays`,
        ].join("\n"),
      });
    } catch {
      // best-effort; ignore email failures
    }
  }

  const notifiedColleagues = await notifyColleagues(companyId, celebrant);
  return { docId, notifiedColleagues };
}

async function findTodaysBirthdayLetter(employeeId: string): Promise<string | null> {
  if (!isPortalTemplateModelReady()) return null;
  const doc = await prisma.portalDocument.findFirst({
    where: {
      employeeId,
      kind: "LETTER",
      title: "Birthday wishes",
      issuedAt: { gte: startOfUtcDay() },
    },
    select: { id: true },
    orderBy: { issuedAt: "desc" },
  });
  return doc?.id ?? null;
}

async function countWishesFor(employeeId: string, birthdayOn: Date) {
  if (!isBirthdayWishModelReady()) return 0;
  return prisma.birthdayWish.count({ where: { recipientId: employeeId, birthdayOn } });
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
  celebrant: BirthdayCelebrant
): Promise<number> {
  if (!isNotificationModelReady()) return 0;
  const name = `${celebrant.firstName} ${celebrant.lastName}`;
  const title = `🎉 ${name} is celebrating a birthday`;
  const colleagueUsers = await prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
      archivedAt: null,
      ...(celebrant.userId ? { id: { not: celebrant.userId } } : {}),
    },
    select: { id: true },
  });

  let notified = 0;
  for (const user of colleagueUsers) {
    if (await hasNotificationToday(user.id, title)) continue;
    await createNotification({
      userId: user.id,
      type: "birthday",
      title,
      message: `Wish ${celebrant.firstName} a happy birthday today — leave a message on the birthday wall.`,
      href: "/birthdays",
    });
    notified += 1;
  }
  return notified;
}

async function hasNotificationToday(userId: string, title: string): Promise<boolean> {
  if (!isNotificationModelReady()) return false;
  const existing = await prisma.notification.count({
    where: {
      userId,
      title,
      createdAt: { gte: startOfUtcDay() },
    },
  });
  return existing > 0;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

function yearsOfService(hireDate: Date, at: Date = new Date()) {
  let years = at.getUTCFullYear() - hireDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - hireDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < hireDate.getUTCDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

function birthdayEmailHtml(
  celebrant: BirthdayCelebrant,
  companyName: string,
  wishCount: number
): string {
  const today = formatDate(new Date());
  const firstName = escapeHtml(celebrant.firstName);
  const company = escapeHtml(companyName);
  const jobTitle = escapeHtml(celebrant.jobTitle);
  const department = celebrant.department?.name ? escapeHtml(celebrant.department.name) : "";
  const roleLine = department ? `${jobTitle} · ${department}` : jobTitle;
  const tenure = yearsOfService(celebrant.hireDate);
  const birthdayUrl = `${getAppUrl()}/birthdays`;
  const wishLine =
    wishCount > 0
      ? `Your colleagues have already left <strong>${wishCount}</strong> birthday wish${
          wishCount === 1 ? "" : "es"
        } for you.`
      : "Your colleagues are waiting to celebrate you — open the birthday wall to see their messages.";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Happy Birthday, ${firstName}!</title></head>
<body style="margin:0;padding:0;background:#f7f5ff;font-family:Arial,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#db2777 100%);border-radius:20px;padding:32px 24px;text-align:center;color:#ffffff;">
      <div style="font-size:40px;line-height:1;">🎂</div>
      <h1 style="margin:14px 0 6px;font-size:28px;line-height:1.2;">Happy Birthday, ${firstName}!</h1>
      <p style="margin:0;font-size:15px;opacity:.9;">${company} is celebrating you today.</p>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:24px;margin-top:16px;">
      <p style="margin:0 0 12px;color:#555;">${today}</p>
      <p style="margin:0 0 12px;">Dear ${firstName},</p>
      <p style="margin:0 0 12px;">On behalf of everyone at <strong>${company}</strong>, we would like to wish you a very happy birthday. Thank you for your hard work, dedication, and the positive energy you bring to the team every day.</p>
      <div style="background:#faf5ff;border:1px solid #ede9fe;border-radius:12px;padding:14px 16px;margin:18px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;">Celebrating</p>
        <p style="margin:4px 0 0;font-weight:700;color:#4c1d95;">${roleLine}</p>
        ${
          tenure > 0
            ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${tenure} year${
                tenure === 1 ? "" : "s"
              } with ${company}</p>`
            : ""
        }
      </div>
      <p style="margin:0 0 12px;">May your day be filled with joy, and may the year ahead bring you success, good health, and happiness both personally and professionally.</p>
      <p style="margin:0 0 20px;color:#4c1d95;font-weight:600;">${wishLine}</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${birthdayUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;">See your birthday wishes</a>
      </div>
      <p style="margin:0;color:#374151;">Warm regards,<br/>Human Resources<br/><strong>${company}</strong></p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#9ca3af;">You are receiving this because today is your birthday.</p>
  </div>
</body>
</html>`;
}