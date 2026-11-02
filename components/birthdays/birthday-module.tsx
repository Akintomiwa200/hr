"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  CalendarDays,
  Gift,
  Heart,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Avatar, Button, EmptyState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import type {
  BirthdayPageData,
  BirthdayPerson,
  BirthdayWishView,
} from "@/lib/birthday-wishes";

function countdown(person: BirthdayPerson) {
  if (person.daysUntil === 0) return "Today";
  if (person.daysUntil === 1) return "Tomorrow";
  return `In ${person.daysUntil} days`;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cake;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/70 px-4 py-3 backdrop-blur">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
      </div>
    </div>
  );
}

function PersonCard({
  person,
  onWish,
  highlight,
}: {
  person: BirthdayPerson;
  onWish: (person: BirthdayPerson) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-white p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center",
        highlight ? "border-violet-200 ring-1 ring-violet-100" : "border-gray-100"
      )}
    >
      <Avatar
        firstName={person.firstName}
        lastName={person.lastName}
        src={person.avatar}
        size={highlight ? "lg" : "md"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {person.firstName} {person.lastName}
          </p>
          {person.isToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-600 ring-1 ring-pink-100">
              <Sparkles className="h-3 w-3" /> Today
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {person.jobTitle}
          {person.department ? ` · ${person.department}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {highlight ? "Today" : person.dateLabel}
            {!highlight ? ` · ${countdown(person)}` : ""}
          </span>
          {person.turningAge !== null && person.turningAge > 0 && (
            <span>Turning {person.turningAge}</span>
          )}
          {person.yearsOfService !== null && person.yearsOfService > 0 && (
            <span>
              {person.yearsOfService} year{person.yearsOfService === 1 ? "" : "s"} with us
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {person.wishCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600">
            <Heart className="h-3.5 w-3.5 fill-current" />
            {person.wishCount}
          </span>
        )}
        <Button
          size="sm"
          variant={person.myWishId ? "secondary" : "primary"}
          onClick={() => onWish(person)}
        >
          {person.myWishId ? (
            <>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit wish
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send wish
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function BirthdayModule({
  data,
  currentUserId,
}: {
  data: BirthdayPageData;
  currentUserId: string;
}) {
  const router = useRouter();
  const [composerFor, setComposerFor] = useState<BirthdayPerson | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BirthdayWishView | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openComposer(person: BirthdayPerson) {
    const existing = person.myWishId
      ? data.wishes.find((wish) => wish.id === person.myWishId)
      : undefined;
    setComposerFor(person);
    setMessage(existing?.message ?? "");
    setError(null);
  }

  function closeComposer() {
    if (submitting) return;
    setComposerFor(null);
    setMessage("");
    setError(null);
  }

  async function submitWish() {
    if (!composerFor || !message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/birthday-wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: composerFor.employeeId,
          message: message.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Could not send your birthday wish.");
        return;
      }
      setComposerFor(null);
      setMessage("");
      router.refresh();
    } catch {
      setError("Could not send your birthday wish. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteWish() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/birthday-wishes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  const editingExisting = Boolean(
    composerFor?.myWishId &&
      data.wishes.some((wish) => wish.id === composerFor.myWishId)
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Cake className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Make someone&apos;s day</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85">
                Birthdays are celebrated company-wide. Your message appears instantly on the
                birthday wall for everyone at {data.companyName}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:shrink-0">
            <Stat icon={Cake} label="Today" value={data.stats.todayCount} />
            <Stat icon={CalendarDays} label="Next 30 days" value={data.stats.upcomingCount} />
            <Stat icon={MessageSquare} label="Wishes today" value={data.stats.wishesToday} />
            <Stat icon={Heart} label="Total wishes" value={data.stats.totalWishes} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Celebrating today</h3>
            <p className="text-xs text-gray-500">
              Send a personalised wish while their special day is live.
            </p>
          </div>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-600">
            {data.today.length} {data.today.length === 1 ? "birthday" : "birthdays"}
          </span>
        </div>

        {data.today.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <Gift className="mx-auto h-7 w-7 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-900">No birthdays today</p>
            <p className="mt-1 text-xs text-gray-500">
              Check the upcoming list below so you can be the first to celebrate.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.today.map((person) => (
              <PersonCard key={person.employeeId} person={person} onWish={openComposer} highlight />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Coming up</h3>
            <p className="text-xs text-gray-500">
              The next birthdays across the company, soonest first.
            </p>
          </div>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <CalendarDays className="mx-auto h-7 w-7 text-gray-300" />
            <p className="mt-2 text-sm font-semibold text-gray-900">No upcoming birthdays yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Birthdays appear here as soon as employees add their date of birth.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.upcoming.map((person) => (
              <PersonCard key={person.employeeId} person={person} onWish={openComposer} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Birthday wall</h3>
            <p className="text-xs text-gray-500">
              Every wish sent this year, updated live for the whole company.
            </p>
          </div>
          <span className="text-[11px] font-medium text-gray-500">
            {data.wishes.length} {data.wishes.length === 1 ? "message" : "messages"}
          </span>
        </div>

        {!data.wishesEnabled ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 text-sm text-amber-900">
            The birthday wall is being prepared. Run <code>prisma generate</code> and restart the
            server to enable wishes.
          </div>
        ) : data.wishes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="The wall is waiting for its first wish"
            description="Pick a colleague above and leave a message to get the celebrations started."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.wishes.map((wish) => {
              const edited =
                new Date(wish.updatedAt).getTime() - new Date(wish.createdAt).getTime() > 1000;
              return (
                <article
                  key={wish.id}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      firstName={wish.authorName.split(" ")[0] ?? wish.authorName}
                      lastName={wish.authorName.split(" ").slice(1).join(" ") || " "}
                      src={wish.authorAvatar}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {wish.authorName}
                        {wish.authorId === currentUserId ? " (you)" : ""}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        To {wish.recipientName}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {formatRelativeTime(wish.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">
                    {wish.message}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-50 pt-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      {edited ? "Edited" : "Posted"} ·{" "}
                      {new Date(wish.birthdayOn).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      {wish.isMine && (
                        <button
                          type="button"
                          onClick={() => {
                            const person = [...data.today, ...data.upcoming].find(
                              (candidate) => candidate.myWishId === wish.id
                            );
                            if (person) openComposer(person);
                          }}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-violet-600"
                          aria-label="Edit your wish"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {wish.canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(wish)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete wish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(composerFor)}
        onClose={closeComposer}
        title={
          composerFor
            ? `${editingExisting ? "Edit your wish for" : "Wish"} ${composerFor.firstName} a happy birthday`
            : "Send a birthday wish"
        }
        description={`Your message is visible to everyone at ${data.companyName}.`}
      >
        <div className="space-y-4">
          {composerFor && (
            <div className="flex items-center gap-3 rounded-xl bg-violet-50/60 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                {initials(composerFor.firstName, composerFor.lastName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {composerFor.firstName} {composerFor.lastName}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {composerFor.isToday ? "Birthday today" : composerFor.dateLabel}
                  {composerFor.jobTitle ? ` · ${composerFor.jobTitle}` : ""}
                </p>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="birthday-wish-message"
              className="mb-1.5 block text-xs font-semibold text-gray-700"
            >
              Your message
            </label>
            <textarea
              id="birthday-wish-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={600}
              placeholder={`Happy birthday, ${composerFor?.firstName ?? "colleague"}! Wishing you a wonderful year ahead…`}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
              <span>Be kind, specific, and celebratory.</span>
              <span>{message.length}/600</span>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeComposer} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitWish} disabled={submitting || !message.trim()}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {editingExisting ? "Update wish" : "Post to wall"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        title="Delete this birthday wish?"
        description="The message will be removed from the company birthday wall for everyone."
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              &ldquo;{deleteTarget.message}&rdquo;
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Keep it
            </Button>
            <Button variant="danger" onClick={deleteWish} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete wish
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
