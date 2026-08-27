"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Share2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { ShareFolderDialog } from "@/components/documents/share-folder-dialog";import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { isSseHandshake } from "@/lib/events";

export type FolderRow = {
  id: string;
  name: string;
  description: string | null;
  createdByName: string;
  createdAt: Date | string;
  fileCount: number;
  totalSizeLabel: string;
  sharedLabel: string;
  shareScope: string;
  shareTargets: string | null;
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

export function DocumentsModule({
  folders: initial,
  canManage,
  departments,
}: {
  folders: FolderRow[];
  canManage: boolean;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [folders, setFolders] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareFolder, setShareFolder] = useState<FolderRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFolders(initial);
  }, [initial]);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          data?: Record<string, unknown>;
        };
        if (isSseHandshake(payload.type, payload.data)) return;
        if (
          payload.type &&
          payload.type !== "document_updated" &&
          payload.type !== "folder_updated"
        ) {
          return;
        }
        router.refresh();
      } catch {
        // ignore heartbeat / malformed payloads
      }
    };
    return () => es.close();
  }, [router]);

  const createFolder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/document-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create folder"));
        return;
      }
      notify.success("Folder created");
      setCreateOpen(false);
      setForm({ name: "", description: "" });
      router.refresh();
    } catch {
      notify.error("Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-gray-500">These are the uploaded documents.</p>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
        )}
      </div>

      {folders.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No folders yet"
            description={canManage ? "Create a folder to organize company documents." : "No shared folders are available yet."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Created By</th>
                  <th className="px-5 py-3 font-semibold">Created Date</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Files</th>
                  <th className="px-5 py-3 font-semibold">Size</th>
                  <th className="px-5 py-3 font-semibold">Shared</th>
                  {canManage && <th className="px-5 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {folders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/documents/${folder.id}`}
                        className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-brand-600"
                      >
                        <FolderOpen className="w-4 h-4 text-brand-500" />
                        {folder.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{folder.createdByName}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(folder.createdAt)}</td>
                    <td className="px-5 py-4 text-gray-500 max-w-[200px] truncate">
                      {folder.description || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{folder.fileCount}</td>
                    <td className="px-5 py-4 text-gray-600">{folder.totalSizeLabel}</td>
                    <td className="px-5 py-4">
                      <Badge variant="info">{folder.sharedLabel}</Badge>
                    </td>
                    {canManage && (
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setShareFolder(folder)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Share
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Add New Folder" width="md">
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Name</label>
              <input
                className={inputClass}
                placeholder="Designer Essential"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Description</label>
              <textarea
                className={inputClass}
                rows={4}
                placeholder="Input description folder"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="shrink-0 border-t border-gray-100 p-6 flex justify-end gap-2 bg-white">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button loading={loading} onClick={createFolder}>
              Create
            </Button>
          </div>
        </div>
      </Sheet>
      {shareFolder && (
        <ShareFolderDialog
          folder={shareFolder}
          departments={departments}
          onClose={() => setShareFolder(null)}
          onSaved={() => {
            setShareFolder(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
