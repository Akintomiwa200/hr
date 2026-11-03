import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type EmployeeDocumentRow = { id: string; title: string; fileName: string; fileSizeLabel: string; uploadedBy: string; createdAt: string; visibility: string; folderName: string };

export function EmployeeDocumentsList({ documents, employeeId }: { documents: EmployeeDocumentRow[]; employeeId: string }) {
  if (!documents.length) return <Card><EmptyState icon={FileText} title="No uploaded documents found" description="Files attached to this employee will appear here." /></Card>;
  return <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400"><th className="px-5 py-3">Document</th><th className="px-5 py-3">Folder</th><th className="px-5 py-3">Uploaded by</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Size</th><th className="px-5 py-3">Access</th></tr></thead><tbody className="divide-y divide-gray-50">{documents.map((doc) => <tr key={doc.id} className="hover:bg-gray-50/50"><td className="px-5 py-4"><Link className="font-medium text-brand-600 hover:underline" href={`/documents/file/${doc.id}?employeeId=${employeeId}`}>{doc.title}</Link><p className="mt-0.5 text-xs text-gray-500">{doc.fileName}</p></td><td className="px-5 py-4 text-gray-600">{doc.folderName}</td><td className="px-5 py-4 text-gray-600">{doc.uploadedBy}</td><td className="px-5 py-4 text-gray-500">{formatDate(doc.createdAt)}</td><td className="px-5 py-4 text-gray-600">{doc.fileSizeLabel}</td><td className="px-5 py-4 text-gray-600">{doc.visibility.toLowerCase()}</td></tr>)}</tbody></table></div></Card>;
}
