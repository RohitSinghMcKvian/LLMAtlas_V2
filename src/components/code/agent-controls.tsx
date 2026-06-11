"use client";

import { useState } from "react";
import { ShieldCheck, Hand, Zap, History, RotateCcw } from "lucide-react";
import type { AutonomyMode, Checkpoint } from "@/lib/code/agent-store";
import { cn } from "@/lib/utils";

export interface RunStats {
  turns: number;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  elapsedMs: number;
}

interface Props {
  mode: AutonomyMode;
  onMode: (m: AutonomyMode) => void;
  busy: boolean;
  stats: RunStats | null;
  checkpoints: Checkpoint[];
  onRevert: (id: string) => void;
}

const MODES: Array<{ id: AutonomyMode; label: string; icon: typeof Hand; title: string }> = [
  { id: "manual", label: "Manual", icon: Hand, title: "Approve every file change and command" },
  { id: "smart", label: "Smart", icon: ShieldCheck, title: "Auto-run reads, tests & commands; approve file writes" },
  { id: "autonomous", label: "Auto", icon: Zap, title: "Run everything unattended — a workspace snapshot is taken first" },
];

const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
const fmtCost = (n: number) => (n <= 0 ? "free" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const fmtTime = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

export function AgentControls({ mode, onMode, busy, stats, checkpoints, onRevert }: Props) {
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  return (
    <div className="border-b bg-card/60 px-2.5 py-2 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Autonomy segmented control */}
        <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onMode(m.id)}
                disabled={busy}
                title={m.title}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <m.icon className="h-3 w-3" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Checkpoints */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowCheckpoints((v) => !v)}
            disabled={checkpoints.length === 0}
            title="Restore a saved workspace snapshot"
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px]",
              checkpoints.length ? "hover:bg-accent text-muted-foreground" : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
          >
            <History className="h-3 w-3" />
            {checkpoints.length || ""}
          </button>
          {showCheckpoints && checkpoints.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-lg border bg-popover shadow-lg p-1.5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-medium">Checkpoints</div>
              {checkpoints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onRevert(c.id); setShowCheckpoints(false); }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs hover:bg-accent text-left"
                >
                  <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-[11px] text-muted-foreground">{c.files.length}f</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live meter */}
      {stats && stats.turns > 0 && (
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-mono px-0.5">
          <span title="Agent turns">{stats.turns} turn{stats.turns === 1 ? "" : "s"}</span>
          <span className="opacity-40">·</span>
          <span title="Tokens in / out">↑{fmtTok(stats.tokensIn)} ↓{fmtTok(stats.tokensOut)}</span>
          <span className="opacity-40">·</span>
          <span title="Estimated cost">{fmtCost(stats.costUSD)}</span>
          <span className="opacity-40">·</span>
          <span title="Elapsed">{fmtTime(stats.elapsedMs)}</span>
          {busy && <span className="ml-auto text-violet-500 animate-pulse">working…</span>}
        </div>
      )}
    </div>
  );
}
