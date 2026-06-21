"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame, CalendarClock, Eye, Code2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type UpcomingModel, type UpcomingStatus,
  UPCOMING_BY_WINDOW, BENCHMARKS, BENCHMARK_BY_KEY, formatContext,
} from "@/lib/leaderboard";
import { projectUpcomingBenchmarks } from "@/lib/global-leaderboard";
import { ScoreBar } from "./score-bar";
import { cn } from "@/lib/utils";

function normalize(key: keyof typeof BENCHMARK_BY_KEY, v: number): number {
  if (key === "arenaElo") return Math.max(0, Math.min(100, ((v - 1000) / (1480 - 1000)) * 100));
  return Math.max(0, Math.min(100, (v / BENCHMARK_BY_KEY[key].max) * 100));
}

const STATUS: Record<UpcomingStatus, { label: string; cls: string }> = {
  rumored:   { label: "Rumored",   cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  announced: { label: "Announced", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
  preview:   { label: "Preview",   cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
};

function HypeMeter({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-2">
      <Flame className="h-3.5 w-3.5 text-orange-500" />
      <div className="relative h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={reduce ? { width: `${value}%` } : undefined}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-6 text-right">{value}</span>
    </div>
  );
}

function UpcomingCard({ u, index }: { u: UpcomingModel; index: number }) {
  const reduce = useReducedMotion();
  const s = STATUS[u.status];
  const bench = projectUpcomingBenchmarks(
    u.expectedBenchmark,
    u.tags,
    u.modalities?.includes("vision") ?? false,
  );
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="card-hover h-full brand-border overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h4 className="font-bold text-sm leading-tight truncate">{u.name}</h4>
              <p className="text-xs text-muted-foreground">{u.vendor}</p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0", s.cls)}>{s.label}</span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">{u.description}</p>

          <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
            {u.context && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                {formatContext(u.context)} ctx
              </span>
            )}
            {u.modalities?.includes("vision") && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><Eye className="h-2.5 w-2.5" />vision</span>
            )}
            {u.modalities?.includes("code") && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5"><Code2 className="h-2.5 w-2.5" />code</span>
            )}
          </div>

          {u.expectedBenchmark != null && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Projected quality</span><span className="font-mono">{u.expectedBenchmark}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: `${u.expectedBenchmark}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  style={reduce ? { width: `${u.expectedBenchmark}%` } : undefined}
                />
              </div>
            </div>
          )}

          <div className="mb-3"><HypeMeter value={u.hype} /></div>

          {/* Detailed projected benchmark grid */}
          <div className="rounded-lg bg-muted/40 p-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Projected benchmarks</span>
              <span className="text-[9px] text-muted-foreground italic">speculative</span>
            </div>
            <div className="space-y-1">
              {BENCHMARKS.slice(0, 6).map((bm) => {
                const v = bench[bm.key];
                if (v == null) return null;
                return (
                  <div key={bm.key} className="flex items-center gap-2 text-[10px]">
                    <span className="w-10 text-muted-foreground flex-shrink-0">{bm.short}</span>
                    <ScoreBar value={normalize(bm.key, v)} color="violet" showValue={false} estimated />
                    <span className="font-mono tabular-nums w-9 text-right">
                      {Math.round(v)}{bm.key === "arenaElo" ? "" : "%"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {u.highlights.slice(0, 3).map((h) => (
              <span key={h} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground rounded-full border px-1.5 py-0.5">
                <Sparkles className="h-2.5 w-2.5 text-amber-500" />{h}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function UpcomingRadar() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <CalendarClock className="h-4 w-4 mt-0.5 flex-shrink-0 text-violet-500" />
        <span>
          A forward-looking radar of the next generation of frontier models. Release windows, specs and
          projected scores are <span className="font-medium text-foreground">speculative estimates</span> compiled
          from public roadmaps and community signals — not confirmed by the vendors.
        </span>
      </div>

      {UPCOMING_BY_WINDOW.map(({ window, items }) => (
        <div key={window}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <h3 className="text-sm font-bold tracking-tight">{window}</h3>
            </div>
            <span className="text-xs text-muted-foreground">{items.length} expected</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((u, i) => <UpcomingCard key={u.id} u={u} index={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
