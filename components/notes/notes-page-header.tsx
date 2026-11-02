"use client";

import { PageHeader } from "@/components/ui";
import { NotesFilterButton } from "@/components/notes/notes-filter-button";

type Props = {
  folders: string[];
  activeCount: number;
  resultCount: number;
  onManageFolders: () => void;
  onClearAll: () => void;
  typeFilter: string;
  onTypeChange: (t: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  folder: string;
  onFolderChange: (f: string) => void;
};

export function NotesPageHeader({
  folders,
  activeCount,
  resultCount,
  onManageFolders,
  onClearAll,
  typeFilter,
  onTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  folder,
  onFolderChange,
}: Props) {
  return (
    <PageHeader
      title="Notes"
      description="Capture notes and run your personal to-do board — private to you."
      action={
        <NotesFilterButton
          typeFilter={typeFilter}
          onTypeChange={onTypeChange}
          startDate={startDate}
          onStartDateChange={onStartDateChange}
          endDate={endDate}
          onEndDateChange={onEndDateChange}
          folder={folder}
          onFolderChange={onFolderChange}
          folders={folders}
          onManageFolders={onManageFolders}
          activeCount={activeCount}
          resultCount={resultCount}
          onClearAll={onClearAll}
        />
      }
    />
  );
}
