"use client";

// Comparison Arena — race one coding task across multiple models in parallel,
// each in an isolated in-memory sandbox, then promote the winner's files into
// the real workspace. See src/lib/brain/arena.ts for the engine.

import { useMemo, useState } from "react";
import {
  Swords, X, Play, Square, Search, Crown, CheckCircle2, XCircle, Loader2,
  FileCode2, ListChecks, Coins, Clock, Hash,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MODELS, PROVIDERS } from "@/lib/models";
import { useSettingsStore, useWorkspaceStore } from "@/lib/store";
import { syncFile } from "@/lib/code/webcontainer";
import { useArenaStore, runArena, stopArena, type ArenaLane } from "@/lib/brain/arena";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const MAX_MODELS = 4;

export function ComparisonArena({ open, onClose, workspaceId }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const writeFile = useWorkspaceStore((s) => s.writeFile);
  const byok = useSettingsStore((s) => s.keys);
  const defaultModel = useSettingsStore((s) => s.defaultModel);

  const running = useArenaStore((s) => s.running);
  const order = useArenaStore((s) => s.order);
  const lanes = useArenaStore((s) => s.lanes);
  const reset = useArenaStore((s) => s.reset);

  const [task, setTask] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(() => {
    const seed = [defaultModel, "groq-llama-3.3-70b", "cerebras-llama-3.3-70b"];
    return [...new Set(seed)].filter((id) => MODELS.some((m) => m.id === id && !m.disabled)).slice(0, 3);
  });

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODELS.filter((m) => !m.disabled && (!q || m.name.toLowerCase().includes(q) || m.vendor.toLowerCase().includes(q))).slice(0, 60);
  }, [query]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_MODELS ? prev : [...prev, id],
    );
  }

  async function start() {
    if (!ws || !task.trim() || selected.length < 2) {
      toast.error("Pick 2–4 models and describe a task");
      return;
    }
    reset();
    try {
      await runArena({ task: task.trim(), modelIds: selected, baseFiles: ws.files, runtime: ws.runtime, byok });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Arena run failed");
    }
  }

  function promote(lane: ArenaLane) {
    const changed = [...lane.changedPaths];
    if (changed.length === 0) { toast.error("This lane produced no file changes"); return; }
    for (const path of changed) {
      if (path in lane.files) {
        writeFile(workspaceId, path, lane.files[path]);
        void syncFile(path, lane.files[path]);
      }
    }
    toast.success(`Promoted ${changed.length} file${changed.length === 1 ? "" : "s"} from ${modelName(lane.modelId)} into the workspace`);
    onClose();
  }

  const hasResults = order.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-2.5 flex items-center gap-2 shrink-0">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Swords className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="font-semibold text-sm">Comparison Arena</div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">one task · many models · side-by-side</span>
        {running ? (
          <Button size="sm" variant="destructive" onClick={stopArena} className="ml-auto h-7 gap-1.5 text-xs">
            <Square className="h-3 w-3" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={selected.length < 2 || !task.trim()} className="ml-auto h-7 gap-1.5 text-xs">
            <Play className="h-3 w-3" /> Run {selected.length} model{selected.length === 1 ? "" : "s"}
          </Button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Setup */}
      <div className="border-b px-4 py-3 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 shrink-0 max-h-[42vh] overflow-y-auto">
        {/* Model picker */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold">Models</span>
            <Badge variant="secondary" className="text-[10px]">{selected.length}/{MAX_MODELS}</Badge>
            <div className="relative ml-auto w-40">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search…" className="h-7 pl-7 text-xs" />
            </div>
          </div>
          <div className="rounded-lg border max-h-56 overflow-y-auto divide-y">
            {candidates.map((m) => {
              const on = selected.includes(m.id);
              const disabled = !on && selected.length >= MAX_MODELS;
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  disabled={disabled || running}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-accent/50 disabled:opacity-40",
                    on && "bg-violet-500/10",
                  )}
                >
                  <span className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0", on ? "bg-violet-500 border-violet-500" : "border-muted-foreground/40")}>
                    {on && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </span>
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{PROVIDERS[m.provider].name}</span>
                  {m.free && <Badge variant="success" className="text-[9px] ml-auto shrink-0">free</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold mb-1.5">Task</span>
          <Textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Add a binary-search function in src/search.js with edge-case handling and a couple of usage examples."
            className="text-sm flex-1 min-h-[120px] resize-none"
            disabled={running}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Each model gets its own copy of the workspace. Shell/test tools are disabled here — compare planning & code, then promote a winner to run it.
          </p>
        </div>
      </div>

      {/* Lanes */}
      <div className="flex-1 overflow-auto p-3">
        {!hasResults ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Swords className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Pick 2–4 models, describe a task, and hit Run.</p>
            <p className="text-xs mt-1">You&apos;ll see their plans, tool calls, output, and cost race in real time.</p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(order.length, 4)}, minmax(260px, 1fr))` }}
          >
            {order.map((id) => (
              <LaneCard key={id} lane={lanes[id]} onPromote={() => promote(lanes[id])} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function modelName(id: string): string {
  return MODELS.find((m) => m.id === id)?.name ?? id;
}

function LaneCard({ lane, onPromote }: { lane: ArenaLane; onPromote: () => void }) {
  if (!lane) return null;
  const statusBadge = {
    running: <Badge variant="secondary" className="text-[10px] gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />running</Badge>,
    done: <Badge variant="success" className="text-[10px]">done</Badge>,
    error: <Badge variant="destructive" className="text-[10px]">error</Badge>,
    aborted: <Badge variant="secondary" className="text-[10px]">stopped</Badge>,
    idle: <Badge variant="secondary" className="text-[10px]">idle</Badge>,
  }[lane.status];

  const changed = lane.changedPaths.size;

  return (
    <div className="rounded-xl border bg-card flex flex-col min-w-0 max-h-[calc(100vh-260px)]">
      {/* Lane header */}
      <div className="px-3 py-2 border-b flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-semibold truncate">{modelName(lane.modelId)}</span>
        <span className="ml-auto">{statusBadge}</span>
      </div>

      {/* Stats */}
      <div className="px-3 py-1.5 border-b grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Hash className="h-2.5 w-2.5" />{lane.turns} turns</span>
        <span className="inline-flex items-center gap-1"><Coins className="h-2.5 w-2.5" />${lane.costUSD.toFixed(5)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{(lane.elapsedMs / 1000).toFixed(1)}s</span>
        <span className="inline-flex items-center gap-1"><FileCode2 className="h-2.5 w-2.5" />{changed} changed</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs min-w-0">
        {lane.plan.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              <ListChecks className="h-3 w-3" /> Plan
            </div>
            <ul className="space-y-0.5">
              {lane.plan.map((s, i) => (
                <li key={i} className={cn("flex items-start gap-1.5", s.status === "done" && "text-muted-foreground line-through")}>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.status === "done" ? "var(--primary)" : s.status === "in_progress" ? "#f59e0b" : "#9ca3af" }} />
                  <span className="break-words">{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lane.toolCalls.length > 0 && (
          <div className="space-y-0.5">
            {lane.toolCalls.slice(-12).map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                {t.ok === undefined ? <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" /> : t.ok ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500 shrink-0" /> : <XCircle className="h-2.5 w-2.5 text-red-500 shrink-0" />}
                <span className="shrink-0">{t.name}</span>
                <span className="truncate">{(t.args.path as string) ?? ""}</span>
              </div>
            ))}
          </div>
        )}

        {(lane.text || lane.summary) && (
          <div className="whitespace-pre-wrap break-words leading-relaxed bg-muted/30 rounded-lg p-2 border">
            {lane.text || lane.summary}
          </div>
        )}

        {lane.error && (
          <div className="text-[11px] text-red-500 bg-red-500/5 border border-red-500/20 rounded-lg p-2 break-words">{lane.error}</div>
        )}
      </div>

      {/* Footer: promote */}
      <div className="px-2.5 py-2 border-t">
        <Button
          size="sm"
          variant={lane.status === "done" && changed > 0 ? "default" : "outline"}
          onClick={onPromote}
          disabled={changed === 0}
          className="w-full h-7 gap-1.5 text-xs"
        >
          <Crown className="h-3 w-3" /> Promote winner
        </Button>
      </div>
    </div>
  );
}
