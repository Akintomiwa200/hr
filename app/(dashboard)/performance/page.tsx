import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, statusBadge, EmptyState } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import { Star } from "lucide-react";

export default async function PerformancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { employeeId: session.employeeId }
      : session.role === "MANAGER" && session.employeeId
        ? { OR: [{ employeeId: session.employeeId }, { managerId: session.employeeId }] }
        : {};

  const reviews = await prisma.performanceReview.findMany({
    where: whereClause,
    include: { employee: true, manager: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        description={
          session.role === "EMPLOYEE"
            ? "View your performance reviews and goals"
            : "Manage team performance evaluations"
        }
      />

      {reviews.length === 0 ? (
        <Card>
          <EmptyState
            icon={Star}
            title="No performance reviews"
            description="Performance reviews will appear here once created."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {fullName(review.employee.firstName, review.employee.lastName)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Period: {review.period} · Manager:{" "}
                    {fullName(review.manager.firstName, review.manager.lastName)}
                  </p>
                </div>
                {statusBadge(review.status)}
              </div>

              {review.rating && (
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating!
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-2">{review.rating}/5</span>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Goals</p>
                  <p className="text-gray-700">{review.goals}</p>
                </div>
                {review.achievements && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Achievements</p>
                    <p className="text-gray-700">{review.achievements}</p>
                  </div>
                )}
                {review.feedback && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Feedback</p>
                    <p className="text-gray-700">{review.feedback}</p>
                  </div>
                )}
              </div>

              {review.reviewDate && (
                <p className="text-xs text-gray-400 mt-4">
                  Reviewed on {formatDate(review.reviewDate)}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
