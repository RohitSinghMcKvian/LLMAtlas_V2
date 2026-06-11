"use client";

import { useState, useMemo } from "react";
import { History, Trash2, Download, GitBranch, MessageSquare, Clock, X } from "lucide-react";
import { useAgentStore, type AgentMessage } from "@/lib/code/agent-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onRestore: (messages: AgentMessage[]) => void;
}

interface SavedSession {
  id: string;
  name: string;
  messages: AgentMessage[];
  savedAt: number;
  messageCount: number;
  preview: string;
}

const STORAGE_KEY = "llmatlas-sessions";

function loadSessions(): SavedSession[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export function saveCurrentSession(workspaceId: string, name?: string): string | null {
  const state = useAgentStore.getState().byWorkspace[workspaceId];
  if (!state || state.messages.length === 0) return null;

  const sessions = loadSessions();
  const preview = state.messages.find((m) => m.role === "user")?.content.slice(0, 100) ?? "";
  const id = crypto.randomUUID();
  const session: SavedSession = {
    id,
    name: name || `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    messages: state.messages,
    savedAt: Date.now(),
    messageCount: state.messages.length,
    preview,
  };
  sessions.unshift(session);
  saveSessions(sessions);
  return id;
}

export function exportSessionAsMarkdown(workspaceId: string): string {
  const state = useAgentStore.getState().byWorkspace[workspaceId];
  if (!state) return "";
  const lines: string[] = [
    `# Agent Session — ${new Date().toLocaleString()}`,
    "",
  ];
  for (const m of state.messages) {
    if (m.role === "user") {
      lines.push(`## You\n\n${m.content}\n`);
    } else if (m.role === "assistant") {
      lines.push(`## Agent\n\n${m.content}\n`);
    } else if (m.role === "tool") {
      const name = m.toolCall?.name ?? "tool";
      const ok = m.toolResult?.ok;
      const output = m.toolResult?.ok
        ? typeof m.toolResult.output === "string" ? m.toolResult.output : JSON.stringify(m.toolResult.output)
        : m.toolResult?.error ?? "";
      lines.push(`### Tool: ${name} ${ok ? "✓" : "✗"}\n\n\`\`\`\n${output.slice(0, 2000)}\n\`\`\`\n`);
    }
  }
  return lines.join("\n");
}

export function downloadMarkdown(workspaceId: string) {
  const md = exportSessionAsMarkdown(workspaceId);
  if (!md) return;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function groupByDate(sessions: SavedSession[]): { label: string; sessions: SavedSession[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; sessions: SavedSession[] }[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "This Week", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.savedAt);
    if (d >= today) groups[0].sessions.push(s);
    else if (d >= yesterday) groups[1].sessions.push(s);
    else if (d >= weekAgo) groups[2].sessions.push(s);
    else groups[3].sessions.push(s);
  }

  return groups.filter((g) => g.sessions.length > 0);
}

export function SessionManager({ open, onClose, workspaceId, onRestore }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>(loadSessions);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(
      (s) => s.name.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  function deleteSession(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    saveSessions(next);
  }

  function restoreSession(s: SavedSession) {
    onRestore(s.messages);
    onClose();
  }

  function forkSession(s: SavedSession) {
    onRestore([...s.messages]);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-[480px] max-w-[94vw] rounded-xl border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold flex-1">Session History</span>
          <span className="text-[10px] text-muted-foreground">{sessions.length} sessions</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-2 border-b">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            className="w-full px-2.5 py-1.5 text-xs bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-primary/40"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {sessions.length === 0 ? "No saved sessions yet." : "No sessions match."}
            </div>
          ) : (
            grouped.map(({ label, sessions: groupSessions }) => (
              <div key={label}>
                <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-popover/90 backdrop-blur-sm border-b">
                  {label}
                </div>
                {groupSessions.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/30"
                    onClick={() => restoreSession(s)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{s.messageCount} msgs</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{s.preview}</div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {formatRelativeTime(s.savedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); forkSession(s); }}
                        title="Fork session"
                        className="p-1 rounded hover:bg-accent"
                      >
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        title="Delete session"
                        className="p-1 rounded hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
