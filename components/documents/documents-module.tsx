"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Copy, FolderOpen, Link2, MoreHorizontal, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { ShareFolderDialog } from "@/components/documents/share-folder-dialog";
import { UploadLinksDialog } from "@/components/documents/upload-links-dialog";
import { notify, readApiError } from "@/lib/toast";
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
  employeeId?: string | null;
  subfolderCount?: number;
};

const inputClass =
  "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

export function DocumentsModule({
  folders: initial,
  canManage,
  departments,
  employees,
  employeeId,
}: {
  folders: FolderRow[];
  canManage: boolean;
  departments: { id: string; name: string }[];
  employees: { id: string; firstName: string; lastName: string }[];
  employeeId?: string;
}) {
  const router = useRouter();
  const folders = initial;
  const [createOpen, setCreateOpen] = useState(false);
  const [shareFolder, setShareFolder] = useState<FolderRow | null>(null);
  const [uploadLinkFolder, setUploadLinkFolder] = useState<FolderRow | null>(null);
  const [uploadLinksOpen, setUploadLinksOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<FolderRow | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderRow | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

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

  const saveFolder = async () => {
    setLoading(true);
    try {
      const res = await fetch(editFolder ? `/api/document-folders/${editFolder.id}` : "/api/document-folders", {
        method: editFolder ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to create folder"));
        return;
      }
      notify.success(editFolder ? "Folder updated" : "Folder created");
      setCreateOpen(false);
      setEditFolder(null);
      setForm({ name: "", description: "" });
      router.refresh();
    } catch {
      notify.error("Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const removeFolder = async () => {
    if (!deleteFolder) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/document-folders/${deleteFolder.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete folder"));
        return;
      }
      notify.success("Folder and its files deleted");
      setDeleteFolder(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete folder");
    } finally {
      setLoading(false);
    }
  };

  const copyFolderLink = async (folder: FolderRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/documents/${folder.id}`);
      notify.success("Folder link copied");
    } catch {
      notify.error("Could not copy the folder link");
    }
    setOpenMenuId(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-gray-500">These are the uploaded documents.</p>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setUploadLinksOpen(true)}>
              <Link2 className="w-4 h-4" />
              Request upload
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              New Folder
            </Button>
          </div>
        )}
      </div>

      {folders.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No folders yet"
            description={employeeId ? "No folders contain documents filed for this employee." : canManage ? "Create a folder to organize company documents." : "No shared folders are available yet."}
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
                        href={`/documents/${folder.id}${employeeId ? `?employeeId=${employeeId}` : ""}`}
                        className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-brand-600"
                      >
                        <FolderOpen className="w-4 h-4 text-brand-500" />
                        {folder.name}
                      </Link>
                      {folder.subfolderCount ? (
                        <p className="mt-0.5 text-[11px] text-gray-400">{folder.subfolderCount} subfolder{folder.subfolderCount === 1 ? "" : "s"}</p>
                      ) : null}
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
                          onClick={(event) => {
                            if (openMenuId === folder.id) {
                              setOpenMenuId(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            const menuHeight = 220;
                            setMenuPosition({
                              top: rect.bottom + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight) : rect.bottom + 4,
                              left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
                            });
                            setOpenMenuId(folder.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                          Actions
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

      {openMenuId && typeof document !== "undefined" && createPortal(
        <>
          <button type="button" aria-label="Close folder actions" className="fixed inset-0 z-[100] cursor-default" onClick={() => setOpenMenuId(null)} />
          {(() => {
            const folder = folders.find((item) => item.id === openMenuId);
            if (!folder) return null;
            return (
              <div style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed z-[101] w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                <Link href={`/documents/${folder.id}${employeeId ? `?employeeId=${employeeId}` : ""}`} onClick={() => setOpenMenuId(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><FolderOpen className="h-4 w-4" />Open</Link>
                {folder.employeeId && (
                  <button type="button" onClick={() => { setUploadLinkFolder(folder); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><Link2 className="h-4 w-4" />Upload link</button>
                )}
                <button type="button" onClick={() => { setShareFolder(folder); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><Share2 className="h-4 w-4" />Share</button>
                <button type="button" onClick={() => { setEditFolder(folder); setForm({ name: folder.name, description: folder.description ?? "" }); setCreateOpen(true); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><Pencil className="h-4 w-4" />Edit</button>
                <button type="button" onClick={() => void copyFolderLink(folder)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><Copy className="h-4 w-4" />Copy link</button>
                <button type="button" onClick={() => { setDeleteFolder(folder); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button>
              </div>
            );
          })()}
        </>,
        document.body
      )}

      <Sheet open={createOpen} onClose={() => { setCreateOpen(false); setEditFolder(null); }} title={editFolder ? "Edit Folder" : "Add New Folder"} width="md">
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">Name</label>
              <input
                className={inputClass}
              placeholder="Folder name"
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
            <Button loading={loading} onClick={saveFolder}>
              {editFolder ? "Save changes" : "Create"}
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
      <UploadLinksDialog
        open={uploadLinksOpen || !!uploadLinkFolder}
        onClose={() => {
          setUploadLinksOpen(false);
          setUploadLinkFolder(null);
        }}
        employees={employees}
        initialEmployeeId={uploadLinkFolder?.employeeId ?? employeeId ?? undefined}
        initialDocumentName=""
        lockEmployee={!!uploadLinkFolder}
      />
      <Dialog open={!!deleteFolder} onClose={() => setDeleteFolder(null)} title="Delete folder">
        <p className="mb-5 text-sm text-gray-600">Delete <strong>{deleteFolder?.name}</strong> and all files inside it? This cannot be undone.</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteFolder(null)}>Cancel</Button><Button variant="danger" loading={loading} onClick={removeFolder}>Delete folder</Button></div>
      </Dialog>
    </>
  );
}
