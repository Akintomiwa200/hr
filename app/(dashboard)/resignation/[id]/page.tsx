import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  UserRound,
} from "lucide-react";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";
import { ResignationActions } from "@/components/resignation/resignation-actions";
import {
  canEndorseResignation,
  canViewResignation,
  isResignationAdmin,
} from "@/lib/resignation/access";
import {
  resignationInclude,
  resignationPeople,
} from "@/lib/resignation/queries";
import {
  canWithdrawStatus,
  resignationStatusLabel,
  resignationStatusVariant,
} from "@/lib/resignation/service";
import { getResignationSettings } from "@/lib/resignation-settings";
import { formatDate, fullName } from "@/lib/utils";

function eventLabel(action: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "Resignation submitted",
    ENDORSED: "Manager endorsed",
    APPROVED: "Approved by HR",
    REJECTED: "Resignation rejected",
    WITHDRAWN: "Resignation withdrawn",
    COMPLETED: "Exit completed",
    SCHEDULE_UPDATED: "Last working day updated",
  };
  return labels[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export default async function ResignationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [resignation, settings] = await Promise.all([
    prisma.resignation.findUnique({
      where: { id },
      include: resignationInclude,
    }),
    getResignationSettings(session.companyId),
  ]);

  if (!resignation) notFound();
  if (
    session.companyId &&
    resignation.companyId &&
    resignation.companyId !== session.companyId
  ) {
    notFound();
  }

  const people = resignationPeople(resignation);
  if (!canViewResignation(session, people)) redirect("/resignation");

  const role = normalizeRole(session.role);
  const admin = isResignationAdmin(role);
  const self = session.employeeId === resignation.employeeId;
  const canEndorse =
    resignation.status === "PENDING_MANAGER" &&
    canEndorseResignation(session, people);
  const canApprove = admin && resignation.status === "PENDING_MANAGER";
  const canReviewHr = admin && resignation.status === "PENDING_HR";
  const canReject =
    (resignation.status === "PENDING_MANAGER" && canEndorse) || canReviewHr;
  const canWithdraw = self && canWithdrawStatus(resignation.status, settings);
  const canComplete = admin && resignation.status === "APPROVED";
  const canSchedule =
    (admin || self) &&
    ["PENDING_MANAGER", "PENDING_HR", "APPROVED"].includes(resignation.status);

  const employeeName = fullName(
    resignation.employee.firstName,
    resignation.employee.lastName,
    resignation.employee.middleName
  );

  return (
    <div>
      <PageLiveRefresh types={["resignation_updated", "employee_updated"]} />
      <Link
        href="/resignation"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to resignations
      </Link>

      <PageHeader
        title={`${employeeName}'s resignation`}
        description={`Submitted ${formatDate(resignation.createdAt)} · ${resignation.noticePeriodDays} day notice`}
        action={
          <ResignationActions
            resignationId={resignation.id}
            lastWorkingDay={resignation.lastWorkingDay.toISOString()}
            canEndorse={canEndorse}
            canApprove={canApprove || canReviewHr}
            canReject={canReject}
            canWithdraw={canWithdraw}
            canComplete={canComplete}
            canSchedule={canSchedule}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar
                  firstName={resignation.employee.firstName}
                  lastName={resignation.employee.lastName}
                  src={resignation.employee.avatar}
                />
                <div>
                  <Link
                    href={`/employees/${resignation.employee.id}`}
                    className="text-base font-semibold text-gray-900 hover:text-brand-600"
                  >
                    {employeeName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {resignation.employee.jobTitle}
                    {resignation.employee.department?.name
                      ? ` · ${resignation.employee.department.name}`
                      : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {resignation.employee.email}
                  </p>
                </div>
              </div>
              <Badge variant={resignationStatusVariant(resignation.status)}>
                {resignationStatusLabel(resignation.status)}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Last working day
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(resignation.lastWorkingDay)}
                </p>
                {formatDate(resignation.requestedLastWorkingDay) !==
                  formatDate(resignation.lastWorkingDay) && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Requested {formatDate(resignation.requestedLastWorkingDay)}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Notice period
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {resignation.noticePeriodDays} day
                  {resignation.noticePeriodDays === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Decision
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {resignation.decidedAt
                    ? formatDate(resignation.decidedAt)
                    : resignation.status === "COMPLETED" && resignation.completedAt
                      ? formatDate(resignation.completedAt)
                      : "Awaiting review"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-gray-400" />
                Reason for leaving
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {resignation.reason}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Every decision and schedule change is recorded here.
            </p>
            <ol className="mt-4 space-y-4">
              {resignation.events.length === 0 ? (
                <li className="text-sm text-gray-500">No activity yet.</li>
              ) : (
                resignation.events.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {eventLabel(event.action)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {event.actorName}
                        {event.actorRole ? ` · ${event.actorRole}` : ""} ·{" "}
                        {formatDate(event.createdAt)}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-sm text-gray-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900">People</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <UserRound className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Manager:</span>
                <span className="font-medium text-gray-800">
                  {resignation.manager
                    ? fullName(
                        resignation.manager.firstName,
                        resignation.manager.lastName
                      )
                    : "Not assigned"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <UserRound className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">HR reviewer:</span>
                <span className="font-medium text-gray-800">
                  {resignation.hrReviewer
                    ? fullName(
                        resignation.hrReviewer.firstName,
                        resignation.hrReviewer.lastName
                      )
                    : "Not reviewed"}
                </span>
              </div>
            </div>
            {(resignation.managerNote || resignation.hrNote) && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                {resignation.managerNote && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Manager note
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {resignation.managerNote}
                    </p>
                  </div>
                )}
                {resignation.hrNote && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      HR note
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{resignation.hrNote}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              Exit checklist
            </h2>
            {resignation.offboardingInstanceId ? (
              <Link
                href={`/checklist/offboarding/${resignation.offboardingInstanceId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline"
              >
                <ClipboardList className="h-4 w-4" />
                Open offboarding checklist
              </Link>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                {resignation.status === "APPROVED" ||
                resignation.status === "COMPLETED"
                  ? "The exit checklist will be linked here once it starts."
                  : "The exit checklist starts automatically after approval."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
