import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, CardHeader } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        include: { department: true },
      })
    : null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Profile Information" description="Your account details" />
          <dl className="p-6 space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{session.email}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">Role</dt>
              <dd className="font-medium text-gray-900 capitalize">{session.role.toLowerCase()}</dd>
            </div>
            {employee && (
              <>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Full Name</dt>
                  <dd className="font-medium text-gray-900">
                    {fullName(employee.firstName, employee.lastName)}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Employee Code</dt>
                  <dd className="font-medium text-gray-900">{employee.employeeCode}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Department</dt>
                  <dd className="font-medium text-gray-900">{employee.department.name}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Job Title</dt>
                  <dd className="font-medium text-gray-900">{employee.jobTitle}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Hire Date</dt>
                  <dd className="font-medium text-gray-900">{formatDate(employee.hireDate)}</dd>
                </div>
              </>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="Manage notification preferences" />
          <div className="p-6 space-y-4">
            {[
              { label: "Leave request updates", desc: "Get notified when leave is approved or rejected" },
              { label: "Payroll notifications", desc: "Receive alerts when payslips are available" },
              { label: "Company announcements", desc: "Stay updated with company news" },
              { label: "Performance reviews", desc: "Notifications for review cycles" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
