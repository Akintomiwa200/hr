"use client";

import { useState } from "react";
import { Globe2, Lock, Pin, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export type BoardNote = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  scope: string;
  column: string;
  folder?: string | null;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const colorDot: Record<string, string> = {
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
};

const columnColors: Record<string, string> = {
  TODO: "border-gray-200 bg-gradient-to-b from-gray-50/60 to-white",
  ONGOING: "border-blue-200 bg-gradient-to-b from-blue-50/40 to-white",
  DONE: "border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white",
};

export const BOARD_COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "ONGOING", label: "In Progress" },
  { id: "DONE", label: "Done" },
] as const;

export function NoteBoard({
  notes,
  currentUserId,
  canManageNote,
  onOpenEdit,
  onCreateInColumn,
  onMoveColumn,
}: {
  notes: BoardNote[];
  currentUserId: string;
  canManageNote: (note: BoardNote) => boolean;
  onOpenEdit: (note: BoardNote) => void;
  onCreateInColumn: (column: string) => void;
  onMoveColumn: (note: BoardNote, column: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const dropNote = (colId: string) => {
    setOverColumn(null);
    const id = dragId;
    const note = notes.find((n) => n.id === id);
    if (note && (note.column || "TODO") !== colId) {
      onMoveColumn(note, colId);
    }
    setDragId(null);
  };

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="Your board is empty"
        description="Add a note to any column to start organizing your work."
        action={
          <button
            type="button"
            onClick={() => onCreateInColumn("TODO")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" /> New note
          </button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {BOARD_COLUMNS.map((col) => {
        const items = notes.filter((n) => (n.column || "TODO") === col.id);
        const isOver = overColumn === col.id && dragId !== null;
        return (
          <div
            key={col.id}
            onDragEnter={(e) => {
              setOverColumn(col.id);
              e.preventDefault();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverColumn(col.id);
            }}
            onDragLeave={() => setOverColumn(col.id === overColumn ? null : overColumn)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragId) {
                dropNote(col.id);
                return;
              }
              const id = e.dataTransfer.getData("text/note-id");
              setDragId(id || null);
              if (id) dropNote(col.id);
            }}
            className={`rounded-2xl border p-3 min-h-[320px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${columnColors[col.id] ?? columnColors.TODO} ${
              isOver ? "border-violet-400 ring-2 ring-violet-200" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
                <button
                  type="button"
                  onClick={() => onCreateInColumn(col.id)}
                  className="p-1 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-white/60"
                  title="Add note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl py-8 text-center text-xs text-gray-400">
                  No notes here yet
                </div>
              ) : (
                items.map((note) => {
                  const canEdit = canManageNote(note);
                  const isMine = note.userId === currentUserId;
                  return (
                    <div
                      key={note.id}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        setDragId(note.id);
                        e.dataTransfer.setData("text/note-id", note.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => (canEdit ? onOpenEdit(note) : undefined)}
                      className={`w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 hover:shadow-md transition-all ${
                        dragId === note.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot[note.color] ?? colorDot.violet}`} />
                          <span className="font-medium text-sm text-gray-900 line-clamp-2">
                            {note.title || "Untitled note"}
                          </span>
                        </div>
                        {note.pinned && <Pin className="w-3 h-3 text-violet-400 shrink-0" />}
                      </div>

                      {note.content && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 mt-2">
                        {note.folder && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                            {note.folder}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          {note.scope === "SHARED" ? (
                            <Globe2 className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {isMine ? "You" : "Shared"}
                        </span>
                        <span>{formatDate(note.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
