"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  FolderPlus,
  Globe2,
  LayoutGrid,
  Lock,
  Pencil,
  Pin,
  Plus,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { notify, readApiError } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { StickyNote } from "lucide-react";
import { useAppEvents } from "@/hooks/use-app-events";
import { scheduleRouterRefresh } from "@/hooks/use-soft-refresh";
import { BOARD_COLUMNS, NoteBoard } from "@/components/notes/note-board";
import { isInRange } from "@/components/notes/notes-filter-button";
import { NotesPageHeader } from "@/components/notes/notes-page-header";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  scope: string;
  column?: string;
  folder?: string | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const colorOptions = [
  { value: "violet", bg: "bg-violet-50 border-violet-200", head: "bg-violet-100", dot: "bg-violet-400", panel: "bg-violet-500" },
  { value: "amber", bg: "bg-amber-50 border-amber-200", head: "bg-amber-100", dot: "bg-amber-400", panel: "bg-amber-500" },
  { value: "emerald", bg: "bg-emerald-50 border-emerald-200", head: "bg-emerald-100", dot: "bg-emerald-400", panel: "bg-emerald-500" },
  { value: "sky", bg: "bg-sky-50 border-sky-200", head: "bg-sky-100", dot: "bg-sky-400", panel: "bg-sky-500" },
  { value: "rose", bg: "bg-rose-50 border-rose-200", head: "bg-rose-100", dot: "bg-rose-400", panel: "bg-rose-500" },
];

function colorStyle(value: string) {
  return colorOptions.find((c) => c.value === value) ?? colorOptions[0];
}

export function NotesModule({
  notes: initial,
  canShare,
  canManageShared,
  currentUserId,
}: {
  notes: Note[];
  canShare: boolean;
  canManageShared: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  useAppEvents({
    types: ["notes_updated"],
    onEvent: () => scheduleRouterRefresh(() => router.refresh()),
  });

  const [notes, setNotes] = useState<Note[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setNotes(initial);
  }

  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [view, setView] = useState<"grid" | "board">("board");
  const [folder, setFolder] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    pinned: false,
    color: "violet",
    scope: "PRIVATE",
    column: "TODO",
    folder: "",
  });
  const [loading, setLoading] = useState(false);

  const [folderModal, setFolderModal] = useState(false);
  const [folderForm, setFolderForm] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (editorOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editorOpen]);

  const folders = useMemo(
    () => Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))) as string[],
    [notes]
  );

  const visible = notes
    .filter((note) => {
      if (typeFilter === "private") return note.userId === currentUserId;
      if (typeFilter === "shared") return note.scope === "SHARED";
      return true;
    })
    .filter((note) => (folder === "all" ? true : note.folder === folder))
    .filter((note) => isInRange(note.updatedAt, startDate, endDate))
    .filter((note) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        (note.folder ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (folder !== "all" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  const canManageNote = (note: Note) =>
    note.userId === currentUserId || (note.scope === "SHARED" && canManageShared);

  const closeEditor = () => {
    setEditorOpen(false);
    setTimeout(() => setEditing(null), 200);
  };

  const openCreate = (presetColumn?: string) => {
    setEditing(null);
    setForm({
      title: "",
      content: "",
      pinned: false,
      color: "violet",
      scope: "PRIVATE",
      column: presetColumn ?? "TODO",
      folder: folder === "all" ? "" : folder,
    });
    setEditorOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content,
      pinned: note.pinned,
      color: note.color,
      scope: note.scope,
      column: note.column ?? "TODO",
      folder: note.folder ?? "",
    });
    setEditorOpen(true);
  };

  const moveColumn = async (note: Note, column: string) => {
    const from = note.column ?? "TODO";
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, column } : n)));
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column }),
      });
      if (!res.ok) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, column: from } : n)));
        notify.error(await readApiError(res, "Failed to move note"));
        return;
      }
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, column: from } : n)));
      notify.error("Failed to move note");
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        editing ? `/api/notes/${editing.id}` : "/api/notes",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to save note"));
        return;
      }
      const saved = (await res.json()) as Note;
      setNotes((prev) =>
        editing ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]
      );
      notify.success(editing ? "Note updated" : "Note created");
      closeEditor();
      router.refresh();
    } catch {
      notify.error("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const togglePinned = async (note: Note) => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to update note"));
        return;
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pinned: !note.pinned } : n))
      );
      router.refresh();
    } catch {
      notify.error("Failed to update note");
    }
  };

  const remove = async () => {
    if (!deleteNote) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${deleteNote.id}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error(await readApiError(res, "Failed to delete note"));
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== deleteNote.id));
      notify.success("Note deleted");
      setDeleteNote(null);
      router.refresh();
    } catch {
      notify.error("Failed to delete note");
    } finally {
      setLoading(false);
    }
  };

  const renameFolder = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) {
      setRenamingFolder(null);
      return;
    }
    if (folders.some((f) => f.toLowerCase() === newName.toLowerCase() && f !== oldName)) {
      notify.error("A folder with that name already exists");
      return;
    }
    setLoading(true);
    try {
      const affected = notes.filter((n) => n.folder === oldName);
      for (const note of affected) {
        await fetch(`/api/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: newName }),
        });
      }
      setNotes((prev) =>
        prev.map((n) => (n.folder === oldName ? { ...n, folder: newName } : n))
      );
      if (folder === oldName) setFolder(newName);
      notify.success("Folder renamed");
      setRenamingFolder(null);
      router.refresh();
    } catch {
      notify.error("Failed to rename folder");
    } finally {
      setLoading(false);
    }
  };

  const deleteFolder = async (name: string) => {
    setLoading(true);
    try {
      const affected = notes.filter((n) => n.folder === name);
      for (const note of affected) {
        await fetch(`/api/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "" }),
        });
      }
      setNotes((prev) =>
        prev.map((n) => (n.folder === name ? { ...n, folder: null } : n))
      );
      if (folder === name) setFolder("all");
      notify.success("Folder deleted (notes moved to no folder)");
      router.refresh();
    } catch {
      notify.error("Failed to delete folder");
    } finally {
      setLoading(false);
    }
  };

  const createFolder = () => {
    const name = folderForm.trim();
    if (!name) return;
    if (folders.some((f) => f.toLowerCase() === name.toLowerCase())) {
      notify.error("A folder with that name already exists");
      return;
    }
    setFolder(name);
    setFolderForm("");
    setFolderModal(false);
    notify.success(`Folder "${name}" created`);
  };

  const activeColor = colorStyle(form.color);

  return (
    <>
      <NotesPageHeader
        folders={folders}
        activeCount={activeFilterCount}
        resultCount={visible.length}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        folder={folder}
        onFolderChange={(f) => { setFolder(f); }}
        onManageFolders={() => setFolderModal(true)}
        onClearAll={() => { setTypeFilter("all"); setStartDate(""); setEndDate(""); setFolder("all"); setSearch(""); }}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={`p-1.5 rounded-lg transition-colors ${
              view === "grid" ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("board")}
            title="Board view"
            className={`p-1.5 rounded-lg transition-colors ${
              view === "board" ? "bg-violet-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <Button className="ml-auto" onClick={() => openCreate()}>
          <Plus className="w-4 h-4" /> New note
        </Button>
      </div>

      {canShare && (
        <p className="mb-4 text-xs text-gray-500">
          Every role can take private notes. Company notes can be created by Company Admin / HR and
          are visible to everyone.
        </p>
      )}

      {view === "board" ? (
        <NoteBoard
          notes={visible.map((n) => ({ ...n, column: n.column ?? "TODO" }))}
          currentUserId={currentUserId}
          canManageNote={canManageNote}
          onOpenEdit={openEdit}
          onCreateInColumn={(column) => openCreate(column)}
          onMoveColumn={moveColumn}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description={
            typeFilter === "shared"
              ? "No company notes have been shared yet."
              : "Capture a quick thought, meeting note, or reminder."
          }
          action={
            <Button onClick={() => openCreate()}>
              <Plus className="w-4 h-4" /> Write a note
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((note) => {
            const style = colorStyle(note.color);
            const isMine = note.userId === currentUserId;
            const canEdit = canManageNote(note);
            return (
              <div
                key={note.id}
                className={`rounded-2xl border ${style.bg} flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`flex items-center justify-between px-4 py-2.5 ${style.head}`}>
                  <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    {note.scope === "SHARED" ? (
                      <>
                        <Globe2 className="w-3.5 h-3.5" /> Company
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Personal
                      </>
                    )}
                    {note.pinned && <Pin className="w-3 h-3" />}
                  </span>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => togglePinned(note)}
                          className="p-1.5 text-gray-500 hover:text-violet-700 rounded-lg"
                          title={note.pinned ? "Unpin" : "Pin"}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(note)}
                          className="p-1.5 text-gray-500 hover:text-violet-700 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteNote(note)}
                          className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (canEdit ? openEdit(note) : undefined)}
                  className="text-left px-4 py-4 flex-1 hover:bg-white/40 transition-colors"
                >
                  {note.title && (
                    <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{note.title}</h3>
                  )}
                  {note.content && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {note.content}
                    </p>
                  )}
                </button>
                <div className="px-4 py-2.5 text-[11px] text-gray-500 border-t border-black/5 flex items-center justify-between">
                  <span>{formatDate(note.updatedAt)}</span>
                  {!isMine && note.scope === "SHARED" && <span>Shared</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen || editing !== null ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
              editorOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeEditor}
          />
          <div
            className={`absolute top-0 right-0 h-full w-full sm:w-[440px] md:w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
              editorOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className={`h-1.5 w-full ${activeColor.panel}`} />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing ? "Edit note" : "New note"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editing ? "Make changes and save" : "Capture your thought"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pinned: !form.pinned })}
                  title={form.pinned ? "Unpin" : "Pin to top"}
                  className={`p-2 rounded-lg transition-colors ${
                    form.pinned
                      ? "text-violet-600 bg-violet-50"
                      : "text-gray-400 hover:text-violet-600 hover:bg-gray-50"
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <Input
                label="Title"
                autoFocus
                placeholder="Note title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />

              <Textarea
                label="Content"
                rows={8}
                placeholder="Write the details..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />

              <section className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Column"
                    value={form.column}
                    onChange={(e) => setForm({ ...form, column: e.target.value })}
                  >
                    {BOARD_COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Folder</label>
                    <input
                      value={form.folder}
                      onChange={(e) => setForm({ ...form, folder: e.target.value })}
                      placeholder="Optional folder"
                      list="note-folders-editor"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <datalist id="note-folders-editor">
                      {folders.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 mr-1">Color</span>
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, color: c.value })}
                        className={`w-5 h-5 rounded-full ${c.dot} ${
                          form.color === c.value ? "ring-2 ring-offset-2 ring-violet-500" : ""
                        }`}
                      />
                    ))}
                  </div>

                  {canShare && (
                    <div className="flex items-center gap-1.5">
                      {["PRIVATE", "SHARED"].map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setForm({ ...form, scope })}
                          title={scope === "PRIVATE" ? "Personal" : "Company-wide"}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            form.scope === scope
                              ? "border-violet-500 bg-violet-50 text-violet-700 font-medium"
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {scope === "PRIVATE" ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Globe2 className="w-3.5 h-3.5" />
                          )}
                          {scope === "PRIVATE" ? "Personal" : "Company"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeEditor}>
                Cancel
              </Button>
              <Button loading={loading} onClick={save}>
                <Check className="w-4 h-4" /> {editing ? "Save changes" : "Create note"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={!!deleteNote} onClose={() => setDeleteNote(null)} title="Delete note">
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{deleteNote?.title || "this note"}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteNote(null)}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={remove}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </Dialog>

      <Dialog open={folderModal} onClose={() => { setFolderModal(false); setFolderForm(""); setRenamingFolder(null); }} title="Manage folders">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Create new folder</label>
            <div className="flex gap-2">
              <input
                value={folderForm}
                onChange={(e) => setFolderForm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                placeholder="e.g. Meeting Notes"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <Button onClick={createFolder} disabled={!folderForm.trim()}>
                <FolderPlus className="w-4 h-4" /> Create
              </Button>
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing folders
                <span className="text-gray-400 font-normal ml-1">({folders.length})</span>
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {folders.map((f) => {
                  const count = notes.filter((n) => n.folder === f).length;
                  return (
                    <div key={f} className={`flex items-center gap-2 p-2 rounded-lg ${renamingFolder === f ? "bg-violet-50 border border-violet-200" : "bg-gray-50"}`}>
                      {renamingFolder === f ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameFolder(f, renameValue);
                            if (e.key === "Escape") setRenamingFolder(null);
                          }}
                          className="flex-1 border border-violet-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-700">{f}</span>
                          <span className="text-xs text-gray-400">{count} note{count === 1 ? "" : "s"}</span>
                        </>
                      )}
                      <div className="flex gap-0.5 shrink-0">
                        {renamingFolder === f ? (
                          <>
                            <button
                              type="button"
                              onClick={() => renameFolder(f, renameValue)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingFolder(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { setRenamingFolder(f); setRenameValue(f); }}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete folder "${f}"? Notes will be moved to no folder.`)) {
                                  deleteFolder(f);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
                              title="Delete folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {folders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No folders yet. Create one to organize your notes.
            </p>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setFolderModal(false); setFolderForm(""); setRenamingFolder(null); }}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
