import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isDocumentUploadLinkModelReady } from "@/lib/prisma";
import {
  fetchUploadLinkByToken,
  uploadLinkState,
  uploadLinkStateLabel,
} from "@/lib/documents/upload-links";
import { PublicUploadForm } from "@/components/documents/public-upload-form";

export const metadata = {
  title: "Upload a document — Smart HR",
};

export default async function PublicUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isDocumentUploadLinkModelReady()) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm border border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">Uploads are not available yet</h1>
          <p className="mt-2 text-sm text-gray-500">Please contact HR and try again later.</p>
        </div>
      </main>
    );
  }

  const link = await fetchUploadLinkByToken(token);
  if (!link) notFound();

  const state = uploadLinkState(link);
  const employeeName = `${link.employee.firstName} ${link.employee.lastName}`.trim();
  const companyName = link.company?.name ?? "Smart HR";
  const folderPath = [link.folder.name, link.subfolder?.name ?? link.documentName].join(" / ");

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-gray-50 to-white px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-700">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-wide">{companyName}</span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-brand-500/5">
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-6 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Secure document upload</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{link.documentName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              For <span className="font-medium text-gray-700">{employeeName}</span>
            </p>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Saved to</dt>
                <dd className="mt-0.5 font-medium text-gray-800">{folderPath}</dd>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-gray-400">Status</dt>
                <dd className="mt-0.5 font-medium text-gray-800">
                  {state === "ACTIVE" ? "Open for upload" : uploadLinkStateLabel(state)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <PublicUploadForm
              token={token}
              documentName={link.documentName}
              initialState={state}
              initialRemaining={Math.max(0, link.maxUploads - link.uploadCount)}
              maxUploads={link.maxUploads}
              expiresAt={link.expiresAt ? link.expiresAt.toISOString() : null}
              employeeName={employeeName}
            />
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-relaxed text-gray-400">
          This link can only be used to file documents in the folder shown above. Files are stored securely and
          visible to HR. You do not need to sign in.
        </p>
      </div>
    </main>
  );
}
