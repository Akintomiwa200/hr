import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment, RECRUITMENT_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, statusBadge } from "@/components/ui";
import { CalendarLink } from "@/components/holidays/calendar-link";
import { HelpLink } from "@/components/help/help-link";
import { InterviewPanel } from "@/components/recruitment/interview-panel";
import { CandidateDetailActions } from "@/components/recruitment/candidate-detail-actions";
import { formatDate, fullName } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageLiveRefresh } from "@/components/dashboard/page-live-refresh";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { include: { department: true } },
      reviewer: true,
      interviews: {
        include: {
          interviewer: true,
          reviews: { include: { reviewer: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
    },
  });

  if (!application) notFound();

  const interviewers = await prisma.employee.findMany({
    where: { user: { role: { in: RECRUITMENT_ROLES } } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  const canManage = canManageRecruitment(session.role);
  const nextInterview = application.interviews.find((i) => i.status === "SCHEDULED");

  return (
    <div>
      <PageLiveRefresh
        types={["job_updated", "interview_updated", "employee_updated"]}
        pollIntervalMs={4000}
      />
      <Link href="/recruitment/candidates" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to candidates
      </Link>

      <PageHeader
        title={fullName(application.firstName, application.lastName)}
        description={`Applied for ${application.job.title}`}
        action={
          <div className="flex flex-wrap items-center gap-4">
            <HelpLink slug="recruitment" label="Recruitment guide" />
            <CalendarLink
              date={
                (nextInterview?.scheduledAt ?? application.appliedAt).toISOString().slice(0, 10)
              }
              label="View on calendar"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Candidate Info</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium">{application.email}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium">{application.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Applied</dt>
              <dd className="font-medium">{formatDate(application.appliedAt)}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Status</dt>
              <dd>{statusBadge(application.status)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-gray-500">Reviewer</dt>
              <dd className="font-medium">
                {application.reviewer
                  ? fullName(application.reviewer.firstName, application.reviewer.lastName)
                  : "Unassigned"}
              </dd>
            </div>
            {application.resumeUrl && (
              <div className="pt-2">
                <a
                  href={application.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                >
                  View resume
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Position</h3>
          <Link href={`/recruitment/${application.job.id}`} className="text-sm font-medium text-violet-600 hover:text-violet-700">
            {application.job.title}
          </Link>
          <p className="text-xs text-gray-500 mt-1">{application.job.department.name}</p>
          {application.coverLetter && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cover Letter</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{application.coverLetter}</p>
            </div>
          )}
          {application.notes && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Internal Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{application.notes}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <InterviewPanel
          applicationId={application.id}
          interviews={application.interviews}
          interviewers={interviewers}
          canManage={canManage}
          currentEmployeeId={session.employeeId}
        />
      </div>

      {canManage && (
        <CandidateDetailActions application={application} reviewers={interviewers} />
      )}
    </div>
  );
}
