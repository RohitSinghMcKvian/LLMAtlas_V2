"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search, Zap, FileCode2, Terminal, MessageSquare, History,
  Brain, Sparkles, HelpCircle, Download, Trash2, GitBranch,
  Eye, EyeOff, Undo2, Redo2, Plus, Play, Settings, Layers,
  Command as CommandIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "session" | "agent" | "tools" | "view" | "navigation";
  shortcut?: string;
  action: () => void;
  hidden?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

const CATEGORY_ORDER: PaletteCommand["category"][] = ["agent", "session", "tools", "view", "navigation"];
const CATEGORY_LABELS: Record<string, string> = {
  agent: "Agent",
  session: "Session",
  tools: "Tools",
  view: "View",
  navigation: "Navigation",
};

export function CommandPalette({ open, onClose, commands }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const visible = commands.filter((c) => !c.hidden);
    if (!query.trim()) return visible;
    const q = query.toLowerCase();
    return visible.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category.includes(q) ||
        c.id.includes(q),
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
      category: cat,
      commands: map.get(cat)!,
    }));
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  const execute = useCallback(
    (cmd: PaletteCommand) => {
      onClose();
      setTimeout(() => cmd.action(), 50);
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flatList.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && flatList[selectedIdx]) {
        e.preventDefault();
        execute(flatList[selectedIdx]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatList, selectedIdx, execute, onClose]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const sel = listRef.current.querySelector("[data-selected='true']");
    sel?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-[520px] max-w-[94vw] rounded-xl border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border bg-muted text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-1.5">
          {grouped.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No commands match.</div>
          ) : (
            grouped.map(({ category, commands: cmds }) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {CATEGORY_LABELS[category]}
                </div>
                {cmds.map((cmd) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const selected = idx === selectedIdx;
                  return (
                    <button
                      key={cmd.id}
                      data-selected={selected}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                        selected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50",
                      )}
                    >
                      <span className="shrink-0 text-muted-foreground">{cmd.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-xs text-muted-foreground ml-2">{cmd.description}</span>
                        )}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="shrink-0 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border bg-muted/60 text-[10px] text-muted-foreground font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-muted font-mono">↑↓</kbd> Navigate</span>
          <span className="inline-flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-muted font-mono">↵</kbd> Execute</span>
          <span className="inline-flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border bg-muted font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl+Shift+K for agent palette (Ctrl+K is the global app palette)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

export function buildAgentCommands(opts: {
  onNewSession: () => void;
  onSessionList: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleThinking: () => void;
  onToggleDetails: () => void;
  onHelp: () => void;
  onSetMode: (m: "manual" | "smart" | "autonomous") => void;
  onSlash: (cmd: string) => void;
  onModelList: () => void;
  thinkingVisible: boolean;
  detailsVisible: boolean;
  canUndo: boolean;
  canRedo: boolean;
}): PaletteCommand[] {
  return [
    {
      id: "slash.plan",
      label: "/plan",
      description: "Analyze and create a task plan",
      icon: <Brain className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSlash("/plan"),
    },
    {
      id: "slash.test",
      label: "/test",
      description: "Run tests, fix failures",
      icon: <Play className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSlash("/test"),
    },
    {
      id: "slash.document",
      label: "/document",
      description: "Generate documentation",
      icon: <FileCode2 className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSlash("/document"),
    },
    {
      id: "slash.init",
      label: "/init",
      description: "Create CLAUDE.md for this workspace",
      icon: <Sparkles className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSlash("/init"),
    },
    {
      id: "slash.explain",
      label: "/explain",
      description: "Explain project architecture",
      icon: <HelpCircle className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSlash("/explain"),
    },
    {
      id: "mode.manual",
      label: "Mode: Manual",
      description: "Approve every action",
      icon: <Settings className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSetMode("manual"),
    },
    {
      id: "mode.smart",
      label: "Mode: Smart",
      description: "Auto-run reads, gate file writes",
      icon: <Zap className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSetMode("smart"),
    },
    {
      id: "mode.autonomous",
      label: "Mode: Autonomous",
      description: "Auto-approve all with checkpoint",
      icon: <Zap className="h-4 w-4" />,
      category: "agent",
      action: () => opts.onSetMode("autonomous"),
    },
    {
      id: "model.list",
      label: "Switch Model",
      description: "Change the LLM model",
      icon: <Layers className="h-4 w-4" />,
      category: "agent",
      shortcut: "Ctrl+M",
      action: opts.onModelList,
    },
    {
      id: "session.new",
      label: "New Session",
      description: "Start a fresh conversation",
      icon: <Plus className="h-4 w-4" />,
      category: "session",
      shortcut: "Ctrl+N",
      action: opts.onNewSession,
    },
    {
      id: "session.list",
      label: "Session History",
      description: "Browse and resume saved sessions",
      icon: <History className="h-4 w-4" />,
      category: "session",
      shortcut: "Ctrl+L",
      action: opts.onSessionList,
    },
    {
      id: "session.export",
      label: "Export Session",
      description: "Save conversation as Markdown",
      icon: <Download className="h-4 w-4" />,
      category: "session",
      shortcut: "Ctrl+E",
      action: opts.onExport,
    },
    {
      id: "session.undo",
      label: "Undo",
      description: "Revert last message and file changes",
      icon: <Undo2 className="h-4 w-4" />,
      category: "session",
      shortcut: "Ctrl+Z",
      hidden: !opts.canUndo,
      action: opts.onUndo,
    },
    {
      id: "session.redo",
      label: "Redo",
      description: "Restore undone message",
      icon: <Redo2 className="h-4 w-4" />,
      category: "session",
      shortcut: "Ctrl+Y",
      hidden: !opts.canRedo,
      action: opts.onRedo,
    },
    {
      id: "view.thinking",
      label: opts.thinkingVisible ? "Hide Thinking" : "Show Thinking",
      description: "Toggle reasoning block visibility",
      icon: opts.thinkingVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
      category: "view",
      shortcut: "Ctrl+T",
      action: opts.onToggleThinking,
    },
    {
      id: "view.details",
      label: opts.detailsVisible ? "Collapse Tool Details" : "Expand Tool Details",
      description: "Toggle tool execution visibility",
      icon: opts.detailsVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
      category: "view",
      action: opts.onToggleDetails,
    },
    {
      id: "help.show",
      label: "Keyboard Shortcuts",
      description: "Show all keybindings",
      icon: <CommandIcon className="h-4 w-4" />,
      category: "navigation",
      shortcut: "?",
      action: opts.onHelp,
    },
  ];
}
