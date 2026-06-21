"use client";

import { useMemo, useState } from "react";
import {
  Search, Pin, PinOff, Archive, ArchiveRestore, Trash2, Copy, Plus,
  BarChart3, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { toast } from "sonner";

import { useCompareStore } from "@/lib/compare-store";
import type { CompareSession } from "@/lib/compare";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  currentId: string | null;
  /** Mobile sheet mode: render without border/width constraints, call onClose when tapping an item. */
  mobile?: boolean;
  onClose?: () => void;
}

export function CompareHistorySidebar({
  collapsed, onToggleCollapsed, onSelect, onNew, currentId, mobile, onClose,
}: Props) {
  const sessions = useCompareStore((s) => s.sessions);
  const remove = useCompareStore((s) => s.removeSession);
  const togglePin = useCompareStore((s) => s.togglePin);
  const toggleArchive = useCompareStore((s) => s.toggleArchive);
  const duplicate = useCompareStore((s) => s.duplicateSession);
  const rename = useCompareStore((s) => s.renameSession);
  const searchFn = useCompareStore((s) => s.search);

  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState("");

  const filtered = useMemo(() => {
    if (query.trim()) return searchFn(query);
    return sessions.filter((s) => (showArchived ? s.archived : !s.archived));
  }, [sessions, query, showArchived, searchFn]);

  const pinned = filtered.filter((s) => s.pinned);
  const others = filtered.filter((s) => !s.pinned);

  function handleSelect(id: string) {
    onSelect(id);
    onClose?.();
  }

  if (collapsed && !mobile) {
    return (
      <aside className="hidden md:flex w-12 flex-shrink-0 flex-col items-center border-r bg-card py-3 gap-3">
        <button onClick={onToggleCollapsed} className="rounded p-2 hover:bg-accent" title="Expand history">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={onNew} className="rounded p-2 hover:bg-accent" title="New comparison">
          <Plus className="h-4 w-4" />
        </button>
        {sessions.filter((s) => !s.archived).slice(0, 6).map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-bold transition-colors",
              currentId === s.id
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                : "text-muted-foreground hover:bg-accent",
            )}
            title={s.title}
          >
            {s.title.slice(0, 2).toUpperCase()}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-card",
        mobile ? "h-full" : "hidden md:flex w-64 flex-shrink-0 border-r",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          onClick={onNew}
          className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-primary px-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
        {mobile ? (
          <button onClick={onClose} className="rounded p-1.5 hover:bg-accent" title="Close">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={onToggleCollapsed} className="rounded p-1.5 hover:bg-accent" title="Collapse">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search comparisons…"
            className="h-8 w-full rounded-md border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <BarChart3 className="mx-auto mb-2 h-5 w-5 opacity-50" />
            {query ? "No matches." : showArchived ? "No archived comparisons." : "No comparisons yet."}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <SessionGroup
                label="Pinned"
                items={pinned}
                currentId={currentId}
                editingId={editingId}
                editBuf={editBuf}
                onSelect={handleSelect}
                onEdit={(id, title) => { setEditingId(id); setEditBuf(title); }}
                onCommitEdit={() => { if (editingId && editBuf.trim()) rename(editingId, editBuf.trim()); setEditingId(null); }}
                onCancelEdit={() => setEditingId(null)}
                onEditChange={setEditBuf}
                onPin={togglePin}
                onArchive={(id) => { toggleArchive(id); toast.success("Archived"); }}
                onDuplicate={(id) => { duplicate(id); toast.success("Duplicated"); }}
                onRemove={(id) => { if (confirm("Delete this comparison?")) { remove(id); toast.success("Deleted"); } }}
              />
            )}
            <SessionGroup
              label={query ? "Results" : showArchived ? "Archived" : "Recent"}
              items={others}
              currentId={currentId}
              editingId={editingId}
              editBuf={editBuf}
              onSelect={handleSelect}
              onEdit={(id, title) => { setEditingId(id); setEditBuf(title); }}
              onCommitEdit={() => { if (editingId && editBuf.trim()) rename(editingId, editBuf.trim()); setEditingId(null); }}
              onCancelEdit={() => setEditingId(null)}
              onEditChange={setEditBuf}
              onPin={togglePin}
              onArchive={(id) => { toggleArchive(id); toast.success(showArchived ? "Restored" : "Archived"); }}
              onDuplicate={(id) => { duplicate(id); toast.success("Duplicated"); }}
              onRemove={(id) => { if (confirm("Delete this comparison?")) { remove(id); toast.success("Deleted"); } }}
              archivedMode={showArchived}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {showArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
          {showArchived ? "Show recent" : "Show archived"}
        </button>
      </div>
    </aside>
  );
}

interface GroupProps {
  label: string;
  items: CompareSession[];
  currentId: string | null;
  editingId: string | null;
  editBuf: string;
  archivedMode?: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

function SessionGroup({
  label, items, currentId, editingId, editBuf, archivedMode,
  onSelect, onEdit, onCommitEdit, onCancelEdit, onEditChange,
  onPin, onArchive, onDuplicate, onRemove,
}: GroupProps) {
  if (!items.length) return null;
  return (
    <div className="py-2">
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul>
        {items.map((s) => {
          const active = currentId === s.id;
          const isEditing = editingId === s.id;
          const subtitle = `${s.columns.length} models · ${s.rounds.length} turn${s.rounds.length !== 1 ? "s" : ""}`;
          return (
            <li key={s.id} className="group relative">
              {isEditing ? (
                <input
                  value={editBuf}
                  autoFocus
                  onChange={(e) => onEditChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitEdit();
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  onBlur={onCommitEdit}
                  className="mx-2 w-[calc(100%-1rem)] rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <button
                  onClick={() => onSelect(s.id)}
                  onDoubleClick={() => onEdit(s.id, s.title)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors",
                    active && "bg-accent font-medium",
                  )}
                >
                  <BarChart3 className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-500/70" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{s.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
                  </div>
                  {s.pinned && <Pin className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-primary" />}
                </button>
              )}
              {!isEditing && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 rounded bg-card/80 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => onPin(s.id)} className="rounded p-1 hover:bg-accent" title={s.pinned ? "Unpin" : "Pin"}>
                    {s.pinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                  </button>
                  <button onClick={() => onDuplicate(s.id)} className="rounded p-1 hover:bg-accent" title="Duplicate">
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                  <button onClick={() => onArchive(s.id)} className="rounded p-1 hover:bg-accent" title={archivedMode ? "Restore" : "Archive"}>
                    {archivedMode ? <ArchiveRestore className="h-2.5 w-2.5" /> : <Archive className="h-2.5 w-2.5" />}
                  </button>
                  <button onClick={() => onRemove(s.id)} className="rounded p-1 hover:bg-destructive/10 hover:text-destructive" title="Delete">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
