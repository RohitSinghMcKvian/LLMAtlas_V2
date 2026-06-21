"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Agent — run history & replay (Phase 6)
//
// An in-panel overlay listing past Atlas runs (traces). Open one to see the full
// transcript, REPLAY it (steps reveal one-by-one on a timeline), or export it as
// shareable JSON. Builds on useTraceStore; each trace is a frozen snapshot of a
// run's messages + model/skill/cost/timing.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, Play, Pause, Download, Trash2, Clock, Wrench, Network,
  Wand2, CheckCircle2, XCircle, History,
} from "lucide-react";
import { HexMark } from "@/components/brand/logo";
import { useTraceStore, traceToJson, type Trace } from "@/lib/brain/traces";
import type { AtlasMessage } from "@/lib/brain/atlas-agent-store";
import { cn } from "@/lib/utils";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function TraceViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const traces = useTraceStore((s) => s.traces);
  const remove = useTraceStore((s) => s.remove);
  const clear = useTraceStore((s) => s.clear);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = traces.find((t) => t.id === selectedId) ?? null;

  useEffect(() => { if (!open) setSelectedId(null); }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-30 bg-card flex flex-col"
        >
          {/* Header */}
          <div className="px-3.5 py-3 border-b shrink-0 flex items-center gap-2">
            {selected ? (
              <button onClick={() => setSelectedId(null)} className="p-1.5 -ml-1 rounded-lg hover:bg-accent text-muted-foreground" title="Back">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <History className="h-4 w-4 text-violet-400" />
            )}
            <div className="text-sm font-semibold flex-1 min-w-0 truncate">
              {selected ? selected.title : "Run history"}
            </div>
            {!selected && traces.length > 0 && (
              <button onClick={clear} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent" title="Clear all">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {selected ? (
            <TraceDetail trace={selected} onDelete={() => { remove(selected.id); setSelectedId(null); }} />
          ) : (
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {traces.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                  <History className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium">No runs yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Every Atlas run is recorded here — replay or export any of them.</p>
                </div>
              ) : (
                traces.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="w-full text-left rounded-xl border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <HexMark size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{t.title}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                          <span className="font-mono truncate max-w-[120px]">{t.modelName}</span>
                          {t.skillName && <span className="inline-flex items-center gap-0.5 text-violet-400"><Wand2 className="h-2.5 w-2.5" />{t.skillName}</span>}
                          <span className="inline-flex items-center gap-0.5"><Wrench className="h-2.5 w-2.5" />{t.toolCalls}</span>
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{(t.durationMs / 1000).toFixed(1)}s</span>
                          {t.costUSD > 0 && <span className="tabular-nums">${t.costUSD.toFixed(4)}</span>}
                          <span className="ml-auto opacity-70">{timeAgo(t.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TraceDetail({ trace, onDelete }: { trace: Trace; onDelete: () => void }) {
  const [reveal, setReveal] = useState(trace.messages.length); // all shown by default
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Replay: step the reveal cursor forward on a timeline.
  useEffect(() => {
    if (!playing) return;
    if (reveal >= trace.messages.length) { setPlaying(false); return; }
    timerRef.current = setTimeout(() => setReveal((r) => r + 1), 650);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, reveal, trace.messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [reveal]);

  function replay() {
    setReveal(0);
    setPlaying(true);
  }

  function exportJson() {
    const blob = new Blob([traceToJson(trace)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `atlas-trace-${trace.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const shown = trace.messages.slice(0, reveal);
  return (
    <>
      {/* Replay controls */}
      <div className="px-3 py-2 border-b shrink-0 flex items-center gap-1.5">
        {playing ? (
          <button onClick={() => setPlaying(false)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border bg-card hover:bg-accent text-xs font-medium">
            <Pause className="h-3 w-3" /> Pause
          </button>
        ) : (
          <button onClick={replay} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-medium">
            <Play className="h-3 w-3" /> Replay
          </button>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">{Math.min(reveal, trace.messages.length)}/{trace.messages.length} steps</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={exportJson} title="Export JSON" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Download className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} title="Delete trace" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {shown.map((m) => <TraceRow key={m.id} m={m} />)}
      </div>
    </>
  );
}

function TraceRow({ m }: { m: AtlasMessage }) {
  if (m.role === "tool") {
    const isDelegate = m.tool?.name === "delegate";
    const subs = m.tool?.subagents;
    return (
      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="ml-7 space-y-1.5">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-mono",
          m.tool?.ok === false ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        )}>
          {m.tool?.ok === false ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {isDelegate ? <Network className="h-2.5 w-2.5 opacity-70" /> : <Wrench className="h-2.5 w-2.5 opacity-70" />}
          <span className="font-semibold">{m.tool?.name}</span>
          {isDelegate && subs && <span className="opacity-70">{subs.length} sub-agents</span>}
        </span>
        {isDelegate && subs && subs.length > 0 && (
          <div className="rounded-lg border bg-muted/20 divide-y divide-border/60">
            {subs.map((s) => (
              <div key={s.id} className="px-2 py-1 flex items-center gap-1.5 text-[10px]">
                <span className="font-mono uppercase px-1 py-0.5 rounded bg-background border text-muted-foreground">{s.role}</span>
                <span className="flex-1 min-w-0 truncate">{s.summary || s.task}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }
  const isUser = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2 text-xs", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <div className="mt-0.5 shrink-0"><HexMark size={20} /></div>}
      <div className={cn(
        "rounded-2xl px-3 py-2 max-w-[82%] whitespace-pre-wrap break-words leading-relaxed",
        isUser ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-br-sm" : "bg-muted/50 border border-muted rounded-bl-sm",
      )}>
        {m.content || <span className="opacity-60 italic">(tool step)</span>}
      </div>
    </motion.div>
  );
}
