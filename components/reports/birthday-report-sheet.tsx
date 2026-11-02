import { Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const columns = [
  { key: "name", label: "Employee Name" },
  { key: "employeeCode", label: "Employee ID" },
  { key: "department", label: "Department" },
  { key: "jobTitle", label: "Job Title" },
  { key: "dateOfBirth", label: "Date Of Birth" },
  { key: "age", label: "Age" },
] as const;

export function BirthdayReportSheet({
  rows,
}: {
  rows: Record<string, unknown>[];
}) {
  return (
    <Card className="overflow-hidden rounded-lg border border-[#dadce0] bg-white p-0 shadow-sm">
      <div className="flex h-11 items-center border-b border-[#dadce0] bg-[#f8f9fa] px-4">
        <span className="mr-3 h-5 w-1 rounded-full bg-[#34a853]" />
        <span className="text-sm font-medium text-[#3c4043]">Birthday report</span>
        <span className="ml-auto text-xs text-[#5f6368]">{rows.length} employees</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[850px] border-collapse text-[13px] text-[#202124]">
          <thead className="sticky top-0 z-10">
            <tr className="h-8 bg-[#f8f9fa] text-center text-xs font-medium text-[#5f6368]">
              <th className="w-11 border border-[#dadce0] bg-[#f1f3f4]" aria-label="Row number" />
              {columns.map((_, index) => (
                <th key={index} className="border border-[#dadce0] font-medium">
                  {String.fromCharCode(65 + index)}
                </th>
              ))}
            </tr>
            <tr className="h-10 bg-[#e6f4ea] text-left font-semibold text-[#202124]">
              <th className="border border-[#dadce0] bg-[#f1f3f4] text-center text-xs font-medium text-[#5f6368]">1</th>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-[#dadce0] px-3">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="h-9 hover:bg-[#f8fbf8]">
                <td className="border border-[#dadce0] bg-[#f8f9fa] text-center text-xs text-[#5f6368]">{index + 2}</td>
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap border border-[#dadce0] px-3 py-1.5">
                    {column.key === "dateOfBirth" && row[column.key]
                      ? formatDate(String(row[column.key]))
                      : String(row[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            )) : (
              <tr className="h-12">
                <td className="border border-[#dadce0] bg-[#f8f9fa] text-center text-xs text-[#5f6368]">2</td>
                <td colSpan={columns.length} className="border border-[#dadce0] px-3 text-[#5f6368]">No data for the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
