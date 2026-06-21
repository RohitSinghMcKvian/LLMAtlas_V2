"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Plus, Minus, FileCode2, Terminal as TermIcon, Trash2, Columns, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingMutation } from "@/lib/code/tools";
import { makeUnifiedDiff } from "@/lib/code/tools";

interface Props {
  mutation: PendingMutation;
  onApprove: () => void;
  onReject: () => void;
  onAutoApprove: () => void;
}

type DiffMode = "unified" | "split";

export function DiffViewer({ mutation, onApprove, onReject, onAutoApprove }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [diffMode, setDiffMode] = useState<DiffMode>("unified");
  // Command-style preview for run_bash, git, MCP, and other external/action
  // tools (anything that carries a `command` string rather than a file diff).
  const isCommandStyle = mutation.command != null;
  const Icon = isCommandStyle ? TermIcon : mutation.toolName === "delete_file" ? Trash2 : FileCode2;

  const diffText = useMemo(() => {
    if (isCommandStyle) return mutation.command ?? "";
    if (mutation.toolName === "delete_file") return mutation.before;
    return makeUnifiedDiff(mutation.before, mutation.after ?? "", mutation.path ?? "file");
  }, [mutation, isCommandStyle]);

  const lines = diffText.split("\n");
  const addCount = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const delCount = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
  const isFileDiff = !isCommandStyle;

  const splitPairs = useMemo(() => {
    if (!isFileDiff || diffMode !== "split") return [];
    const oldLines: (string | null)[] = [];
    const newLines: (string | null)[] = [];
    for (const line of lines) {
      if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
      if (line.startsWith("-")) {
        oldLines.push(line.slice(1));
        newLines.push(null);
      } else if (line.startsWith("+")) {
        if (oldLines.length > 0 && newLines[newLines.length - 1] === null) {
          newLines[newLines.length - 1] = line.slice(1);
        } else {
          oldLines.push(null);
          newLines.push(line.slice(1));
        }
      } else {
        oldLines.push(line.startsWith(" ") ? line.slice(1) : line);
        newLines.push(line.startsWith(" ") ? line.slice(1) : line);
      }
    }
    return oldLines.map((o, i) => ({ old: o, new: newLines[i] ?? null }));
  }, [lines, diffMode, isFileDiff]);

  return (
    <div className="rounded-lg border bg-amber-500/5 border-amber-500/30 text-xs min-w-0">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 hover:bg-amber-500/10 min-w-0"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        <Icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-mono font-medium shrink-0">{mutation.toolName}</span>
        <span className="text-muted-foreground truncate min-w-0 text-left text-[11px]">
          {mutation.path ?? mutation.command}
        </span>
        {addCount > 0 && <span className="text-green-600 font-mono shrink-0">+{addCount}</span>}
        {delCount > 0 && <span className="text-red-500 font-mono shrink-0">-{delCount}</span>}
        <span className="text-[11px] uppercase text-amber-600 dark:text-amber-400 font-semibold shrink-0">pending</span>
      </button>

      {!collapsed && (
        <>
          {isFileDiff && (
            <div className="flex items-center gap-1 px-2.5 pb-1">
              <button
                onClick={() => setDiffMode("unified")}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                  diffMode === "unified" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <AlignJustify className="h-2.5 w-2.5" /> Unified
              </button>
              <button
                onClick={() => setDiffMode("split")}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                  diffMode === "split" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Columns className="h-2.5 w-2.5" /> Split
              </button>
            </div>
          )}

          <div className="px-2.5 pb-2.5">
            {diffMode === "unified" || !isFileDiff ? (
              <pre className="text-[11px] font-mono bg-background/80 p-2.5 rounded-md border overflow-auto max-h-52 leading-relaxed">
                {lines.map((line, i) => (
                  <DiffLine key={i} line={line} />
                ))}
              </pre>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 rounded-md border overflow-auto max-h-52">
                <div className="bg-background/80 p-1.5 overflow-auto">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold mb-1 px-1">Before</div>
                  {splitPairs.map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-[10px] font-mono px-1 leading-relaxed whitespace-pre-wrap break-all",
                        p.old === null ? "h-5" : p.new === null ? "bg-red-500/10 text-red-500" : "text-muted-foreground",
                      )}
                    >
                      {p.old ?? " "}
                    </div>
                  ))}
                </div>
                <div className="bg-background/80 p-1.5 overflow-auto border-l">
                  <div className="text-[9px] uppercase text-muted-foreground font-semibold mb-1 px-1">After</div>
                  {splitPairs.map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-[10px] font-mono px-1 leading-relaxed whitespace-pre-wrap break-all",
                        p.new === null ? "h-5" : p.old === null ? "bg-green-500/10 text-green-600 dark:text-green-400" : "text-muted-foreground",
                      )}
                    >
                      {p.new ?? " "}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-1.5 px-2.5 pb-2.5">
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md px-3 py-1.5 font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={onAutoApprove}
              className="inline-flex items-center gap-1 text-xs bg-card border hover:bg-accent rounded-md px-3 py-1.5"
              title="Approve and auto-approve all future tool calls in this session"
            >
              <Plus className="h-3.5 w-3.5" /> Auto-all
            </button>
            <button
              onClick={onReject}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive rounded-md px-3 py-1.5"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DiffLine({ line }: { line: string }) {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return <div className="text-muted-foreground">{line}</div>;
  }
  if (line.startsWith("@@")) {
    return <div className="text-violet-500/80">{line}</div>;
  }
  if (line.startsWith("+")) {
    return (
      <div className="text-green-600 dark:text-green-400 bg-green-500/5">
        <Plus className="h-2.5 w-2.5 inline-block mr-1" />
        {line.slice(1)}
      </div>
    );
  }
  if (line.startsWith("-")) {
    return (
      <div className="text-red-500 bg-red-500/5">
        <Minus className="h-2.5 w-2.5 inline-block mr-1" />
        {line.slice(1)}
      </div>
    );
  }
  return <div className="text-muted-foreground">{line}</div>;
}
