"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type BenchKey,
  BENCHMARKS, BENCHMARK_BY_KEY,
} from "@/lib/leaderboard";
import type { GlobalRow } from "@/lib/global-leaderboard";
import { cn } from "@/lib/utils";

const TOP_N = 40;

function vendorColor(v: string): string {
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }
function heat(pct: number): string {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  let r: number, g: number, b: number;
  if (p < 0.5) { const t = p / 0.5; r = lerp(244, 245, t); g = lerp(63, 158, t); b = lerp(94, 11, t); }
  else { const t = (p - 0.5) / 0.5; r = lerp(245, 16, t); g = lerp(158, 185, t); b = lerp(11, 129, t); }
  return `rgba(${r},${g},${b},0.92)`;
}
function norm(key: BenchKey, v: number): number {
  if (key === "arenaElo") return ((v - 1000) / (1480 - 1000)) * 100;
  return (v / BENCHMARK_BY_KEY[key].max) * 100;
}

export function GlobalBenchmarkGrid({
  rows, onSelect,
}: { rows: GlobalRow[]; onSelect: (r: GlobalRow) => void }) {
  const reduce = useReducedMotion();
  const [sortKey, setSortKey] = useState<BenchKey | "composite">("composite");

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      if (sortKey === "composite") return b.composite - a.composite;
      return (b.bench[sortKey] ?? -1) - (a.bench[sortKey] ?? -1);
    });
    return list.slice(0, TOP_N);
  }, [rows, sortKey]);

  const leaders = useMemo(() => {
    return BENCHMARKS.map((bm) => {
      let best: { row: GlobalRow; v: number } | null = null;
      for (const r of rows) {
        const v = r.bench[bm.key];
        if (v == null) continue;
        if (!best || v > best.v) best = { row: r, v };
      }
      return { bm, best };
    });
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {leaders.map(({ bm, best }) => (
          <Card key={bm.key} className="card-hover p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1" title={bm.description}>
              {bm.short}<Info className="h-2.5 w-2.5 opacity-50" />
            </div>
            {best ? (
              <button
                type="button"
                onClick={() => onSelect(best.row)}
                className="text-left w-full hover:opacity-80 transition-opacity"
              >
                <div className="text-lg font-bold tabular-nums leading-none mt-1" style={{ color: heat(norm(bm.key, best.v)) }}>
                  {Math.round(best.v)}{bm.key === "arenaElo" ? "" : "%"}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={best.row.model.name}>
                  {best.row.model.name}
                </p>
              </button>
            ) : <div className="text-sm text-muted-foreground mt-1">—</div>}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Sort by:</span>
        {(["composite", ...BENCHMARKS.map((b) => b.key)] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              sortKey === k ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {k === "composite" ? "Composite" : BENCHMARK_BY_KEY[k].short}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base">Global benchmark heatmap — top {TOP_N}</CardTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-6 rounded-sm" style={{ background: "linear-gradient(90deg, rgba(244,63,94,.9), rgba(245,158,11,.9), rgba(16,185,129,.9))" }} />
              low → high
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(45deg, hsl(var(--muted-foreground)/.3), hsl(var(--muted-foreground)/.3) 2px, transparent 2px, transparent 3px)" }} />
              estimated
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px] border-separate border-spacing-y-0.5 px-3 pb-3">
              <thead>
                <tr className="text-[10px] text-muted-foreground">
                  <th className="text-left px-2 py-2 font-medium sticky left-0 bg-card z-10">Model</th>
                  {BENCHMARKS.map((bm) => (
                    <th key={bm.key} className="px-1.5 py-2 font-medium text-center" title={`${bm.label} — ${bm.description}`}>
                      {bm.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <motion.tr
                    key={r.model.id}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.012, 0.4) }}
                    onClick={() => onSelect(r)}
                    className="cursor-pointer group"
                  >
                    <td className="px-2 py-1 sticky left-0 bg-card z-10 group-hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-1.5 min-w-[150px]">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: vendorColor(r.model.vendor) }} />
                        <span className="truncate text-xs font-medium">{r.model.name}</span>
                      </div>
                    </td>
                    {BENCHMARKS.map((bm) => {
                      const v = r.bench[bm.key];
                      if (v == null) {
                        return <td key={bm.key} className="px-1.5 py-1 text-center text-muted-foreground/40 text-xs">—</td>;
                      }
                      return (
                        <td key={bm.key} className="px-1 py-1">
                          <div
                            className="rounded-md text-center text-[11px] font-semibold text-white py-1 tabular-nums relative overflow-hidden"
                            style={{ backgroundColor: heat(norm(bm.key, v)) }}
                            title={`${bm.label}: ${Math.round(v)}${bm.key === "arenaElo" ? "" : "%"}${r.benchReported ? " (reported)" : " (estimated)"}`}
                          >
                            {!r.benchReported && (
                              <span className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,.35) 3px, rgba(255,255,255,.35) 4px)" }} />
                            )}
                            <span className="relative">{Math.round(v)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
