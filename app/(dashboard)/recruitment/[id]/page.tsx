import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageRecruitment } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, statusBadge } from "@/components/ui";
import { ModulePageActions } from "@/components/help/module-page-actions";
import { AddCandidateDialog } from "@/components/recruitment/add-candidate-dialog";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { ArrowLeft, MapPin } from "lucide-react";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      department: true,
      applications: {
        include: {
          reviewer: true,
          interviews: { orderBy: { scheduledAt: "desc" }, take: 1 },
        },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!job) notFound();
  const canManage = canManageRecruitment(session.role);

  return (
    <div>
      <Link href="/recruitment" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to jobs
      </Link>

      <PageHeader
        title={job.title}
        description={job.department.name}
        action={<ModulePageActions helpSlug="recruitment" helpLabel="Recruitment guide" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-start justify-between mb-4">
            {statusBadge(job.status)}
            <Badge variant="info">{job.applications.length} applicants</Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
            <span>{job.type}</span>
            {job.salaryMin && job.salaryMax && (
              <span>{formatCurrency(job.salaryMin)} – {formatCurrency(job.salaryMax)}</span>
            )}
          </div>
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">About the role</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Requirements</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
            </div>
            {job.responsibilities && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Responsibilities</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            )}
            {job.benefits && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Benefits</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.benefits}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-6">Posted {formatDate(job.postedAt)}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Applicants</h3>
            {canManage && <AddCandidateDialog jobId={job.id} />}
          </div>
          <div className="space-y-3">
            {job.applications.map((app) => (
              <Link
                key={app.id}
                href={`/recruitment/candidates/${app.id}`}
                className="block p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <p className="text-sm font-medium text-gray-900">{fullName(app.firstName, app.lastName)}</p>
                <p className="text-xs text-gray-500">{app.email}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {statusBadge(app.status)}
                  {app.interviews[0] && (
                    <span className="text-[10px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                      Interview {formatDate(app.interviews[0].scheduledAt)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            {job.applications.length === 0 && (
              <p className="text-sm text-gray-500">No applications yet.</p>
            )}
          </div>
          <Link href="/recruitment/candidates" className="inline-block mt-4 text-sm text-violet-600 hover:text-violet-700">
            View all candidates →
          </Link>
        </Card>
      </div>
    </div>
  );
}
