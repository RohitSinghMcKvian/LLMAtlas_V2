"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  files: string[];
  query: string;
  position: { top: number; left: number };
  onSelect: (path: string) => void;
  onClose: () => void;
}

function fuzzyMatch(pattern: string, str: string): boolean {
  const p = pattern.toLowerCase();
  const s = str.toLowerCase();
  if (s.includes(p)) return true;
  let pi = 0;
  for (let si = 0; si < s.length && pi < p.length; si++) {
    if (s[si] === p[pi]) pi++;
  }
  return pi === p.length;
}

function scoreMatch(pattern: string, str: string): number {
  const p = pattern.toLowerCase();
  const s = str.toLowerCase();
  const filename = s.split("/").pop() ?? s;
  if (filename === p) return 100;
  if (filename.startsWith(p)) return 90;
  if (filename.includes(p)) return 80;
  if (s.includes(p)) return 60;
  return 40;
}

export function FileMentionPopup({ files, query, position, onSelect, onClose }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    if (!query) return files.slice(0, 12);
    return files
      .filter((f) => fuzzyMatch(query, f))
      .sort((a, b) => scoreMatch(query, b) - scoreMatch(query, a))
      .slice(0, 12);
  }, [files, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx((i) => Math.min(i + 1, matches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && matches[selectedIdx]) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(matches[selectedIdx]);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [matches, selectedIdx, onSelect, onClose]);

  useEffect(() => {
    const sel = listRef.current?.querySelector("[data-selected='true']");
    sel?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (matches.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute z-50 w-[280px] max-h-[240px] overflow-y-auto rounded-lg border bg-popover shadow-lg p-1"
      style={{ bottom: position.top, left: Math.min(position.left, 100) }}
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        Files {query && `· "${query}"`}
      </div>
      {matches.map((path, i) => {
        const parts = path.split("/");
        const name = parts.pop()!;
        const dir = parts.join("/");
        return (
          <button
            key={path}
            data-selected={i === selectedIdx}
            onClick={() => onSelect(path)}
            onMouseEnter={() => setSelectedIdx(i)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors",
              i === selectedIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
            )}
          >
            <FileCode2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{name}</span>
            {dir && <span className="text-[10px] text-muted-foreground truncate ml-auto">{dir}</span>}
          </button>
        );
      })}
      <div className="px-2 py-1 text-[9px] text-muted-foreground border-t mt-1">
        <kbd className="px-1 py-0.5 rounded border bg-muted font-mono">↑↓</kbd> Navigate
        <kbd className="px-1 py-0.5 rounded border bg-muted font-mono ml-2">Tab</kbd> Select
        <kbd className="px-1 py-0.5 rounded border bg-muted font-mono ml-2">Esc</kbd> Close
      </div>
    </div>
  );
}
