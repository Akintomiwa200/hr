import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui";
import { fullName } from "@/lib/utils";

export function EmployeeSubpageHeader({
  employee,
  title,
  description,
  action,
}: {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    department: { name: string };
  };
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-[1em] mb-6">
      <Link
        href={`/employees/${employee.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#7B61FF] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {fullName(employee.firstName, employee.lastName)}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            firstName={employee.firstName}
            lastName={employee.lastName}
            size="lg"
          />
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{title}</h1>
            <p className="text-[14px] text-gray-500 mt-0.5">
              {fullName(employee.firstName, employee.lastName)} · {employee.jobTitle} ·{" "}
              {employee.department.name}
            </p>
            {description && (
              <p className="text-[13px] text-gray-400 mt-1">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
