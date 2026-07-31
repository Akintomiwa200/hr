import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause =
    session.role === "EMPLOYEE" && session.employeeId
      ? { OR: [{ employeeId: null }, { employeeId: session.employeeId }] }
      : {};

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = [...new Set(documents.map((d) => d.category))];

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Company policies, contracts, and employee documents"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <Badge key={cat} variant="info">{cat}</Badge>
        ))}
      </div>

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Documents will appear here once uploaded."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-5 hover:border-indigo-200 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="neutral">{doc.category}</Badge>
                    {doc.employee && (
                      <span className="text-xs text-gray-500 truncate">
                        {fullName(doc.employee.firstName, doc.employee.lastName)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(doc.createdAt)}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
