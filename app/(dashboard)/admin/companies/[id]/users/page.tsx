import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { Badge } from "@/components/ui";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompanyUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!company) notFound();

  const users = await prisma.user.findMany({
    where: { companyId: id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      employee: {
        select: { firstName: true, lastName: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">Platform users</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Accounts belonging to this company.
          </p>
        </div>
        <Badge variant="info">{users.length} total</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Employee status</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/60">
                <td className="px-5 py-3">
                  <p className="text-[12.5px] font-medium text-gray-900">
                    {user.employee
                      ? fullName(user.employee.firstName, user.employee.lastName)
                      : user.email.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-gray-500">{user.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                    {roleLabel(user.role)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {user.employee ? (
                    <Badge variant={user.employee.status === "ACTIVE" ? "success" : "neutral"}>
                      {user.employee.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                  ) : (
                    <span className="text-[12px] text-gray-400">No employee record</span>
                  )}
                </td>
                <td className="px-5 py-3 text-[12px] text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                  No users belong to this company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
