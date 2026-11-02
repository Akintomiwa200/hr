import type { SessionUser } from "@/lib/auth";
import { isBirthdayWishModelReady, prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";
import { canManageOrgContent } from "@/lib/roles";
import { fullName } from "@/lib/utils";
import { nextBirthdayOn, startOfUtcDay } from "@/lib/birthdays";

export type BirthdayPerson = {
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  jobTitle: string;
  department: string | null;
  branch: string | null;
  birthdayOn: string;
  dateKey: string;
  dateLabel: string;
  turningAge: number | null;
  yearsOfService: number | null;
  isToday: boolean;
  daysUntil: number;
  wishCount: number;
  myWishId: string | null;
};

export type BirthdayWishView = {
  id: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  birthdayOn: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  canDelete: boolean;
  isMine: boolean;
};

export type BirthdayPageData = {
  companyName: string;
  wishesEnabled: boolean;
  today: BirthdayPerson[];
  upcoming: BirthdayPerson[];
  wishes: BirthdayWishView[];
  stats: {
    todayCount: number;
    upcomingCount: number;
    wishesToday: number;
    totalWishes: number;
  };
};

export type BirthdayWishMutation = {
  id: string;
  recipientId: string;
  authorId: string;
  message: string;
  birthdayOn: string;
  createdAt: string;
  updatedAt: string;
};

type WishWithRelations = {
  id: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  birthdayOn: Date;
  authorId: string;
  recipientId: string;
  author: {
    id: string;
    email: string;
    employee: { firstName: string; lastName: string; avatar: string | null } | null;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
};

const WISH_INCLUDE = {
  author: {
    select: {
      id: true,
      email: true,
      employee: { select: { firstName: true, lastName: true, avatar: true } },
    },
  },
  recipient: { select: { id: true, firstName: true, lastName: true, avatar: true } },
} as const;

function toWishView(wish: WishWithRelations, session: SessionUser): BirthdayWishView {
  const authorName = wish.author.employee
    ? fullName(wish.author.employee.firstName, wish.author.employee.lastName)
    : wish.author.email.split("@")[0];

  return {
    id: wish.id,
    message: wish.message,
    createdAt: wish.createdAt.toISOString(),
    updatedAt: wish.updatedAt.toISOString(),
    birthdayOn: wish.birthdayOn.toISOString(),
    authorId: wish.authorId,
    authorName,
    authorAvatar: wish.author.employee?.avatar ?? null,
    recipientId: wish.recipientId,
    recipientName: fullName(wish.recipient.firstName, wish.recipient.lastName),
    recipientAvatar: wish.recipient.avatar,
    canDelete: wish.authorId === session.id || canManageOrgContent(session.role),
    isMine: wish.authorId === session.id,
  };
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function yearsAt(hireDate: Date, at: Date) {
  let years = at.getUTCFullYear() - hireDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - hireDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < hireDate.getUTCDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

export async function getBirthdayPageData(session: SessionUser): Promise<BirthdayPageData> {
  const wishesEnabled = isBirthdayWishModelReady();
  const companyId = session.companyId ?? null;
  const empty: BirthdayPageData = {
    companyName: "Your company",
    wishesEnabled,
    today: [],
    upcoming: [],
    wishes: [],
    stats: { todayCount: 0, upcomingCount: 0, wishesToday: 0, totalWishes: 0 },
  };

  if (!companyId) return empty;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [company, employees, wishes] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    prisma.employee.findMany({
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
        avatar: true,
        jobTitle: true,
        hireDate: true,
        dateOfBirth: true,
        department: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
    }),
    wishesEnabled
      ? prisma.birthdayWish.findMany({
          where: { companyId, createdAt: { gte: yearStart } },
          include: WISH_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const wishViews = wishes.map((wish) => toWishView(wish, session));

  const countByBirthday = new Map<string, number>();
  const myWishByBirthday = new Map<string, string>();
  for (const wish of wishes) {
    const key = `${wish.recipientId}:${wish.birthdayOn.getTime()}`;
    countByBirthday.set(key, (countByBirthday.get(key) ?? 0) + 1);
    if (wish.authorId === session.id) {
      myWishByBirthday.set(key, wish.id);
    }
  }

  const celebrations: BirthdayPerson[] = employees.flatMap((employee) => {
    if (!employee.dateOfBirth) return [];
    const occurrence = nextBirthdayOn(employee.dateOfBirth, now);
    const daysUntil = Math.round(
      (occurrence.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const key = `${employee.id}:${occurrence.getTime()}`;

    return [
      {
        employeeId: employee.id,
        userId: employee.userId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatar: employee.avatar,
        jobTitle: employee.jobTitle,
        department: employee.department?.name ?? null,
        branch: employee.branch?.name ?? null,
        birthdayOn: occurrence.toISOString(),
        dateKey: occurrence.toISOString().slice(0, 10),
        dateLabel: dateLabel(occurrence),
        turningAge: occurrence.getUTCFullYear() - employee.dateOfBirth.getUTCFullYear(),
        yearsOfService: yearsAt(employee.hireDate, occurrence),
        isToday: daysUntil === 0,
        daysUntil,
        wishCount: countByBirthday.get(key) ?? 0,
        myWishId: myWishByBirthday.get(key) ?? null,
      },
    ];
  });

  const today = celebrations
    .filter((person) => person.isToday)
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  const upcoming = celebrations
    .filter((person) => !person.isToday)
    .sort(
      (a, b) => a.daysUntil - b.daysUntil || a.firstName.localeCompare(b.firstName)
    )
    .slice(0, 12);

  const wishesToday = wishViews.filter(
    (wish) => startOfUtcDay(new Date(wish.createdAt)).getTime() === todayStart.getTime()
  ).length;

  return {
    companyName: company?.name ?? "Your company",
    wishesEnabled,
    today,
    upcoming,
    wishes: wishViews,
    stats: {
      todayCount: today.length,
      upcomingCount: celebrations.filter(
        (person) => person.daysUntil > 0 && person.daysUntil <= 30
      ).length,
      wishesToday,
      totalWishes: wishViews.length,
    },
  };
}

export async function listBirthdayWishes(
  session: SessionUser,
  recipientId?: string
): Promise<BirthdayWishView[]> {
  if (!session.companyId || !isBirthdayWishModelReady()) return [];

  const wishes = await prisma.birthdayWish.findMany({
    where: {
      companyId: session.companyId,
      ...(recipientId ? { recipientId } : {}),
    },
    include: WISH_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return wishes.map((wish) => toWishView(wish, session));
}

export async function createBirthdayWish(
  session: SessionUser,
  input: { recipientId: string; message: string }
): Promise<{ ok: true; wish: BirthdayWishMutation } | { ok: false; error: string }> {
  if (!session.companyId) {
    return { ok: false, error: "No company workspace was found for your account." };
  }

  const recipient = await prisma.employee.findFirst({
    where: {
      id: input.recipientId,
      status: "ACTIVE",
      dateOfBirth: { not: null },
      user: { companyId: session.companyId },
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
  });

  if (!recipient || !recipient.dateOfBirth) {
    return { ok: false, error: "That colleague is not available for birthday wishes." };
  }

  if (recipient.userId === session.id) {
    return { ok: false, error: "You cannot wish yourself — but happy birthday!" };
  }

  const birthdayOn = nextBirthdayOn(recipient.dateOfBirth, new Date());
  const wish = await prisma.birthdayWish.upsert({
    where: {
      recipientId_authorId_birthdayOn: {
        recipientId: recipient.id,
        authorId: session.id,
        birthdayOn,
      },
    },
    create: {
      companyId: session.companyId,
      recipientId: recipient.id,
      authorId: session.id,
      message: input.message,
      birthdayOn,
    },
    update: {
      message: input.message,
      companyId: session.companyId,
    },
  });

  const authorName =
    [session.firstName, session.lastName].filter(Boolean).join(" ") ||
    session.email.split("@")[0];
  const preview =
    input.message.length > 140 ? `${input.message.slice(0, 137)}…` : input.message;

  await createNotification({
    userId: recipient.userId,
    type: "birthday",
    title: `💌 ${authorName} sent you a birthday wish`,
    message: preview,
    href: "/birthdays",
  });

  broadcastAppEvent("birthday_updated", {
    id: wish.id,
    recipientId: recipient.id,
    authorId: session.id,
  });

  return {
    ok: true,
    wish: {
      id: wish.id,
      recipientId: wish.recipientId,
      authorId: wish.authorId,
      message: wish.message,
      birthdayOn: wish.birthdayOn.toISOString(),
      createdAt: wish.createdAt.toISOString(),
      updatedAt: wish.updatedAt.toISOString(),
    },
  };
}

export async function deleteBirthdayWish(
  session: SessionUser,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!session.companyId || !isBirthdayWishModelReady()) {
    return { ok: false, error: "Birthday wishes are not ready yet." };
  }

  const wish = await prisma.birthdayWish.findUnique({
    where: { id },
    select: { id: true, companyId: true, authorId: true, recipientId: true },
  });

  if (!wish || wish.companyId !== session.companyId) {
    return { ok: false, error: "That birthday wish could not be found." };
  }

  if (wish.authorId !== session.id && !canManageOrgContent(session.role)) {
    return { ok: false, error: "You can only delete your own birthday wish." };
  }

  await prisma.birthdayWish.delete({ where: { id } });
  broadcastAppEvent("birthday_updated", {
    id: wish.id,
    recipientId: wish.recipientId,
    authorId: wish.authorId,
  });

  return { ok: true };
}
