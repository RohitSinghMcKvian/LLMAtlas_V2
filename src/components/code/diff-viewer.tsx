"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Plus, Minus, FileCode2, Terminal as TermIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingMutation } from "@/lib/code/tools";
import { makeUnifiedDiff } from "@/lib/code/tools";

interface Props {
  mutation: PendingMutation;
  onApprove: () => void;
  onReject: () => void;
  onAutoApprove: () => void;
}

export function DiffViewer({ mutation, onApprove, onReject, onAutoApprove }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = mutation.toolName === "run_bash" ? TermIcon : mutation.toolName === "delete_file" ? Trash2 : FileCode2;

  const diffText = useMemo(() => {
    if (mutation.toolName === "run_bash") return mutation.command ?? "";
    if (mutation.toolName === "delete_file") return mutation.before;
    return makeUnifiedDiff(mutation.before, mutation.after ?? "", mutation.path ?? "file");
  }, [mutation]);

  const lines = diffText.split("\n");
  const addCount = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const delCount = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

  return (
    <div className="rounded-md border bg-amber-500/5 border-amber-500/30 text-xs">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-amber-500/10"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        <Icon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        <span className="font-mono font-medium">{mutation.toolName}</span>
        <span className="text-muted-foreground truncate flex-1 text-left">
          {mutation.path ?? mutation.command}
        </span>
        {addCount > 0 && (
          <span className="text-green-600 font-mono">+{addCount}</span>
        )}
        {delCount > 0 && (
          <span className="text-red-500 font-mono">-{delCount}</span>
        )}
        <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">pending</span>
      </button>

      {!collapsed && (
        <>
          <div className="px-2 pb-2">
            <pre className="text-[10px] font-mono bg-background/80 p-2 rounded border overflow-auto max-h-48 leading-relaxed">
              {lines.map((line, i) => (
                <DiffLine key={i} line={line} />
              ))}
            </pre>
          </div>
          <div className="flex items-center gap-1.5 px-2 pb-2">
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded px-2 py-1"
            >
              <CheckCircle2 className="h-3 w-3" /> Approve
            </button>
            <button
              onClick={onAutoApprove}
              className="inline-flex items-center gap-1 text-xs bg-card border hover:bg-accent rounded px-2 py-1"
              title="Approve and auto-approve all future tool calls in this session"
            >
              <Plus className="h-3 w-3" /> Auto-approve
            </button>
            <button
              onClick={onReject}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive rounded px-2 py-1"
            >
              <XCircle className="h-3 w-3" /> Reject
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
      <div className="text-green-600 dark:text-green-400">
        <Plus className="h-2.5 w-2.5 inline-block mr-1" />
        {line.slice(1)}
      </div>
    );
  }
  if (line.startsWith("-")) {
    return (
      <div className="text-red-500">
        <Minus className="h-2.5 w-2.5 inline-block mr-1" />
        {line.slice(1)}
      </div>
    );
  }
  return <div className="text-muted-foreground">{line}</div>;
}
