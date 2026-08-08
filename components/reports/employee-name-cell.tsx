import { Avatar } from "@/components/ui";

export function EmployeeNameCell({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <Avatar firstName={firstName} lastName={lastName} size="sm" />
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {firstName} {lastName}
        </p>
        <p className="text-xs text-gray-400 truncate">{email}</p>
      </div>
    </div>
  );
}
