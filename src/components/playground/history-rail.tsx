"use client";

import { useMemo, useState } from "react";
import {
  Search, Pin, PinOff, Archive, ArchiveRestore, Trash2, Copy, Plus,
  MessageSquare, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { useConversationStore, type Conversation } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  currentId: string | null;
}

export function HistoryRail({ collapsed, onToggleCollapsed, onSelect, onNew, currentId }: Props) {
  const conversations = useConversationStore((s) => s.conversations);
  const remove = useConversationStore((s) => s.removeConversation);
  const togglePin = useConversationStore((s) => s.togglePin);
  const toggleArchive = useConversationStore((s) => s.toggleArchive);
  const duplicate = useConversationStore((s) => s.duplicateConversation);
  const search = useConversationStore((s) => s.search);
  const rename = useConversationStore((s) => s.renameConversation);

  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState("");

  const filtered = useMemo(() => {
    if (query.trim()) {
      const ids = new Set(search(query).map((h) => h.conversation.id));
      return conversations.filter((c) => ids.has(c.id));
    }
    return conversations.filter((c) => (showArchived ? c.archived : !c.archived));
  }, [conversations, query, showArchived, search]);

  const pinned = filtered.filter((c) => c.pinned);
  const others = filtered.filter((c) => !c.pinned);

  if (collapsed) {
    return (
      <aside className="w-12 border-r bg-card flex flex-col items-center py-3 gap-3">
        <button onClick={onToggleCollapsed} className="p-2 rounded hover:bg-accent" title="Expand">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={onNew} className="p-2 rounded hover:bg-accent" title="New chat">
          <Plus className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-r bg-card flex flex-col">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <button
          onClick={onNew}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md border bg-primary text-primary-foreground hover:opacity-90 text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
        <button onClick={onToggleCollapsed} className="p-1.5 rounded hover:bg-accent" title="Collapse">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full h-8 pl-7 pr-2 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <MessageSquare className="h-5 w-5 mx-auto mb-2 opacity-50" />
            {query ? "No matches." : showArchived ? "No archived chats." : "No conversations yet."}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <Section
                title="Pinned"
                items={pinned}
                currentId={currentId}
                editingId={editingId}
                editBuf={editBuf}
                onEdit={(id, title) => { setEditingId(id); setEditBuf(title); }}
                onCommitEdit={() => {
                  if (editingId && editBuf.trim()) rename(editingId, editBuf.trim());
                  setEditingId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
                onEditChange={setEditBuf}
                onSelect={onSelect}
                onPin={togglePin}
                onArchive={(id) => { toggleArchive(id); toast.success("Archived"); }}
                onDuplicate={(id) => { duplicate(id); toast.success("Duplicated"); }}
                onRemove={(id) => { if (confirm("Delete this conversation?")) { remove(id); toast.success("Deleted"); } }}
              />
            )}
            <Section
              title={query ? "Results" : showArchived ? "Archived" : "Recent"}
              items={others}
              currentId={currentId}
              editingId={editingId}
              editBuf={editBuf}
              onEdit={(id, title) => { setEditingId(id); setEditBuf(title); }}
              onCommitEdit={() => {
                if (editingId && editBuf.trim()) rename(editingId, editBuf.trim());
                setEditingId(null);
              }}
              onCancelEdit={() => setEditingId(null)}
              onEditChange={setEditBuf}
              onSelect={onSelect}
              onPin={togglePin}
              onArchive={(id) => { toggleArchive(id); toast.success(showArchived ? "Restored" : "Archived"); }}
              onDuplicate={(id) => { duplicate(id); toast.success("Duplicated"); }}
              onRemove={(id) => { if (confirm("Delete this conversation?")) { remove(id); toast.success("Deleted"); } }}
              archivedMode={showArchived}
            />
          </>
        )}
      </div>

      <div className="border-t px-3 py-2">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          {showArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
          {showArchived ? "Show recent" : "Show archived"}
        </button>
      </div>
    </aside>
  );
}

interface SectionProps {
  title: string;
  items: Conversation[];
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

function Section({ title, items, currentId, editingId, editBuf, archivedMode, onSelect, onEdit, onCommitEdit, onCancelEdit, onEditChange, onPin, onArchive, onDuplicate, onRemove }: SectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="py-2">
      <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul>
        {items.map((c) => {
          const active = currentId === c.id;
          const isEditing = editingId === c.id;
          return (
            <li key={c.id} className="group relative">
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
                  className="w-full mx-2 px-2 py-1.5 text-xs rounded border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <button
                  onClick={() => onSelect(c.id)}
                  onDoubleClick={() => onEdit(c.id, c.title)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent",
                    active && "bg-accent font-medium",
                  )}
                >
                  <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{c.title}</span>
                  {c.pinned && <Pin className="h-2.5 w-2.5 text-primary flex-shrink-0" />}
                </button>
              )}
              {!isEditing && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-card/80 rounded">
                  <button onClick={() => onPin(c.id)} className="p-1 hover:bg-accent rounded" title={c.pinned ? "Unpin" : "Pin"}>
                    {c.pinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                  </button>
                  <button onClick={() => onDuplicate(c.id)} className="p-1 hover:bg-accent rounded" title="Duplicate">
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                  <button onClick={() => onArchive(c.id)} className="p-1 hover:bg-accent rounded" title={archivedMode ? "Restore" : "Archive"}>
                    {archivedMode ? <ArchiveRestore className="h-2.5 w-2.5" /> : <Archive className="h-2.5 w-2.5" />}
                  </button>
                  <button onClick={() => onRemove(c.id)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded" title="Delete">
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
