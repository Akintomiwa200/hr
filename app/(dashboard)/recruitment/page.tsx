import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader, statusBadge, EmptyState, Badge } from "@/components/ui";
import { formatDate, formatCurrency, fullName } from "@/lib/utils";
import { Briefcase, MapPin } from "lucide-react";

export default async function RecruitmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "EMPLOYEE") redirect("/dashboard");

  const jobs = await prisma.job.findMany({
    include: {
      department: true,
      applications: true,
    },
    orderBy: { postedAt: "desc" },
  });

  const allApplications = await prisma.jobApplication.findMany({
    include: { job: true, reviewer: true },
    orderBy: { appliedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description="Manage job postings and candidate applications"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {jobs.map((job) => (
          <Card key={job.id}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{job.department.name}</p>
                </div>
                {statusBadge(job.status)}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
                <span>{job.type}</span>
                {job.salaryMin && job.salaryMax && (
                  <span>
                    {formatCurrency(job.salaryMin)} – {formatCurrency(job.salaryMax)}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{job.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Posted {formatDate(job.postedAt)}
                </span>
                <Badge variant="info">{job.applications.length} applicants</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="All Applications"
          description={`${allApplications.length} total candidates`}
        />
        {allApplications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Applications will appear here when candidates apply."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applied</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {fullName(app.firstName, app.lastName)}
                      </p>
                      <p className="text-xs text-gray-500">{app.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.job.title}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(app.appliedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {app.reviewer
                        ? fullName(app.reviewer.firstName, app.reviewer.lastName)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(app.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
