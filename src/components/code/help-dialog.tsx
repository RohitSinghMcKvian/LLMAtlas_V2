"use client";

import { X, Command as CommandIcon } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_SECTIONS: { title: string; shortcuts: { keys: string; label: string }[] }[] = [
  {
    title: "General",
    shortcuts: [
      { keys: "Ctrl+Shift+K", label: "Agent command palette" },
      { keys: "Ctrl+N", label: "New session" },
      { keys: "Ctrl+L", label: "Session history" },
      { keys: "Ctrl+E", label: "Export session as Markdown" },
      { keys: "Ctrl+M", label: "Switch model" },
      { keys: "?", label: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Agent Input",
    shortcuts: [
      { keys: "Enter", label: "Send message" },
      { keys: "Shift+Enter", label: "New line" },
      { keys: "@", label: "Reference a file (fuzzy search)" },
      { keys: "!", label: "Run bash command directly" },
      { keys: "/", label: "Slash command autocomplete" },
    ],
  },
  {
    title: "Session",
    shortcuts: [
      { keys: "Ctrl+Z", label: "Undo last message + revert files" },
      { keys: "Ctrl+Y", label: "Redo undone message" },
      { keys: "Ctrl+T", label: "Toggle thinking/reasoning blocks" },
    ],
  },
  {
    title: "Slash Commands",
    shortcuts: [
      { keys: "/plan", label: "Create a task checklist" },
      { keys: "/test", label: "Run tests, fix failures" },
      { keys: "/document", label: "Generate documentation" },
      { keys: "/init", label: "Create CLAUDE.md" },
      { keys: "/explain", label: "Explain architecture" },
      { keys: "/compact", label: "Summarize context to save tokens" },
    ],
  },
];

export function HelpDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-[520px] max-w-[94vw] max-h-[80vh] rounded-xl border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <CommandIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold flex-1">Keyboard Shortcuts</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-52px)] p-4 space-y-5">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-foreground">{s.label}</span>
                    <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded border bg-muted text-[11px] text-muted-foreground font-mono">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t pt-3">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Tips
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Type <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">@filename</kbd> to attach file context to your message</li>
              <li>Type <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">!command</kbd> to run a shell command without the agent</li>
              <li>Drag files from the file tree onto the input to attach them</li>
              <li>Use <strong>Smart</strong> mode for the best balance of speed and safety</li>
              <li>The agent auto-creates checkpoints before autonomous runs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
