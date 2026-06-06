"use client";

import { Keyboard, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Always use Ctrl in the static list; Cmd is shown on Mac at runtime via the Kbd component
const mod = "Ctrl";

const SHORTCUTS = [
  { group: "Composer", items: [
    { keys: ["Enter"], label: "Send message" },
    { keys: ["Shift", "Enter"], label: "New line" },
    { keys: [mod, "K"], label: "Command palette" },
    { keys: [mod, "Enter"], label: "Save & resend edit" },
    { keys: ["Esc"], label: "Cancel edit / close" },
  ]},
  { group: "Navigation", items: [
    { keys: ["Alt", "N"], label: "New conversation" },
    { keys: ["Alt", "E"], label: "Export conversation" },
    { keys: ["Alt", "S"], label: "Share conversation" },
    { keys: ["Alt", "A"], label: "Toggle artifacts" },
    { keys: ["Alt", "H"], label: "Toggle history rail" },
  ]},
  { group: "Messages", items: [
    { keys: [mod, "C"], label: "Copy last response" },
    { keys: [mod, "R"], label: "Regenerate last response" },
    { keys: ["?"], label: "Show this panel" },
  ]},
  { group: "Slash Commands", items: [
    { keys: ["/new"], label: "Start new conversation" },
    { keys: ["/clear"], label: "Clear view" },
    { keys: ["/export"], label: "Export as Markdown" },
    { keys: ["/artifact"], label: "Reopen latest artifact" },
    { keys: ["/help"], label: "Show slash commands" },
  ]},
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsPanel({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
            {SHORTCUTS.map((group) => (
              <div key={group.group}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.group}
                </h3>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground/80">{item.label}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <span className="text-muted-foreground/50 text-xs">+</span>}
                            <Kbd>{k}</Kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
            Press <Kbd>?</Kbd> or <Kbd>Esc</Kbd> to dismiss this panel
          </div>
        </div>
      </div>
    </>
  );
}

export function KeyboardShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Keyboard shortcuts (?)"
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Keyboard className="h-4 w-4" />
    </button>
  );
}
