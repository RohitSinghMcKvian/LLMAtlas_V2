"use client";

import Link from "next/link";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";
import {
  ArrowRight, GitCompare, Database, KeyRound, ExternalLink,
  TrendingUp, TrendingDown, Minus, Check, X,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROVIDERS, requiresApiKey, supportsTools, supportsVision } from "@/lib/models";
import {
  type LeaderboardRow, type PriceOverride, type BenchKey,
  BENCHMARKS, BENCHMARK_BY_KEY, LEADERBOARD_ROWS, rankOf,
  formatContext, formatPrice,
} from "@/lib/leaderboard";
import { ScoreBar } from "./score-bar";
import { cn } from "@/lib/utils";

const TOTAL = LEADERBOARD_ROWS.length;
const AVG_QUALITY = Math.round(
  LEADERBOARD_ROWS.reduce((s, r) => s + r.quality, 0) / TOTAL,
);

function normalize(key: BenchKey, v: number): number {
  if (key === "arenaElo") return Math.max(0, Math.min(100, ((v - 1000) / (1480 - 1000)) * 100));
  return Math.max(0, Math.min(100, (v / BENCHMARK_BY_KEY[key].max) * 100));
}

function bestBenchmark(r: LeaderboardRow) {
  let best: { key: BenchKey; v: number; n: number } | null = null;
  for (const bm of BENCHMARKS) {
    const v = r.bench[bm.key];
    if (v == null) continue;
    const n = normalize(bm.key, v);
    if (!best || n > best.n) best = { key: bm.key, v, n };
  }
  return best;
}

function TrendInline({ trend }: { trend: number }) {
  const flat = trend === 0, up = trend > 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold",
      flat ? "text-muted-foreground" : up ? "text-emerald-500" : "text-rose-500")}>
      <Icon className="h-3 w-3" />{up ? "+" : ""}{trend} this week
    </span>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

export function ModelDetailDrawer({
  row, priceOverride, onClose,
}: {
  row: LeaderboardRow | null;
  priceOverride?: PriceOverride;
  onClose: () => void;
}) {
  const m = row?.model;
  const provider = m ? PROVIDERS[m.provider] : null;
  const rank = m ? rankOf(m.id) : 0;
  const ctx = priceOverride?.context ?? m?.context ?? 0;
  const inPrice = priceOverride?.inputPrice ?? m?.inputPrice ?? 0;
  const outPrice = priceOverride?.outputPrice ?? m?.outputPrice ?? 0;

  const radarData = row
    ? BENCHMARKS
        .filter((bm) => row.bench[bm.key] != null)
        .map((bm) => ({ axis: bm.short, value: normalize(bm.key, row.bench[bm.key]!) }))
    : [];

  const best = row ? bestBenchmark(row) : null;
  const qDiff = row ? row.quality - AVG_QUALITY : 0;

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl !p-0">
        {row && m && provider && (
          <div className="h-full overflow-y-auto">
            <div className="h-1.5 w-full" style={{ backgroundColor: provider.color }} />
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="research" className="text-[10px]">#{rank} of {TOTAL}</Badge>
                  {m.free
                    ? <Badge variant="success" className="text-[10px]">FREE</Badge>
                    : <Badge variant="outline" className="text-[10px]">PAID</Badge>}
                  {m.openSource && <Badge variant="outline" className="text-[10px]">Open weights</Badge>}
                  {requiresApiKey(m) && (
                    <Badge variant="warning" className="text-[10px] gap-0.5"><KeyRound className="h-2.5 w-2.5" />BYOK</Badge>
                  )}
                </div>
                <SheetTitle className="text-2xl leading-tight">{m.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {m.vendor} · {provider.name}{m.released ? ` · released ${m.released}` : ""}
                </p>
              </SheetHeader>

              {/* Composite hero */}
              <div className="flex items-end gap-4 rounded-xl glass-card p-4">
                <div>
                  <div className="text-4xl font-bold tabular-nums leading-none brand-text">{row.composite}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Composite</div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                  {[
                    { l: "Quality", v: row.quality },
                    { l: "Speed", v: row.speed },
                    { l: "Context", v: row.contextScore },
                  ].map((x) => (
                    <div key={x.l}>
                      <div className="text-lg font-bold tabular-nums">{x.v}</div>
                      <div className="text-[10px] text-muted-foreground">{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <TrendInline trend={row.trend} />

              {/* Benchmark radar */}
              {radarData.length >= 3 && (
                <div>
                  <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Benchmark profile
                    <Badge variant={row.benchEstimated ? "outline" : "success"} className="text-[9px]">
                      {row.benchEstimated ? "estimated" : "reported"}
                    </Badge>
                  </h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke={provider.color} fill={provider.color} fillOpacity={0.18} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Per-benchmark bars */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Benchmark scores</h3>
                <div className="space-y-2">
                  {BENCHMARKS.map((bm) => {
                    const v = row.bench[bm.key];
                    return (
                      <div key={bm.key} className="flex items-center gap-3 text-xs" title={bm.description}>
                        <span className="w-20 text-muted-foreground flex-shrink-0">{bm.short}</span>
                        {v == null ? (
                          <span className="text-muted-foreground/50 flex-1">— not applicable</span>
                        ) : (
                          <>
                            <ScoreBar value={normalize(bm.key, v)} color="violet" showValue={false} estimated={row.benchEstimated} />
                            <span className="font-mono tabular-nums w-12 text-right">
                              {Math.round(v)}{bm.key === "arenaElo" ? "" : "%"}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {row.benchEstimated
                    ? "Derived from the model's composite score & capability tags — directional, not measured."
                    : "Sourced from vendor model cards & public benchmark reports (approximate)."}
                </p>
              </div>

              {/* Specs */}
              <div>
                <h3 className="text-sm font-semibold mb-1">Specifications</h3>
                <SpecRow label="Context window">{formatContext(ctx)} tokens</SpecRow>
                <SpecRow label="Input price">{inPrice === 0 ? "Free" : `${formatPrice(inPrice)} / 1M`}</SpecRow>
                <SpecRow label="Output price">{outPrice === 0 ? "Free" : `${formatPrice(outPrice)} / 1M`}</SpecRow>
                <SpecRow label="Modalities">{m.modalities.join(", ")}</SpecRow>
                <SpecRow label="Vision">{supportsVision(m) ? <Check className="h-4 w-4 text-emerald-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" />}</SpecRow>
                <SpecRow label="Tool calling">{supportsTools(m) ? <Check className="h-4 w-4 text-emerald-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" />}</SpecRow>
                <SpecRow label="Open weights">{m.openSource ? <Check className="h-4 w-4 text-emerald-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" />}</SpecRow>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {m.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              </div>

              {/* About / why it ranks */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ranks <span className="font-medium text-foreground">#{rank} of {TOTAL}</span> by composite.
                  Its quality of {row.quality} is{" "}
                  <span className={cn("font-medium", qDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {qDiff >= 0 ? `${qDiff} above` : `${-qDiff} below`}
                  </span>{" "}
                  the catalogue average of {AVG_QUALITY}.
                  {best && ` Strongest on ${BENCHMARK_BY_KEY[best.key].label} (${Math.round(best.v)}${best.key === "arenaElo" ? " Elo" : "%"}).`}
                </p>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="brand" size="sm" className="col-span-2">
                  <Link href={`/playground?model=${m.id}`}>Open in Playground <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/compare"><GitCompare className="h-3.5 w-3.5" /> Compare</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/models"><Database className="h-3.5 w-3.5" /> All models</Link>
                </Button>
                {requiresApiKey(m) && (
                  <Button asChild variant="ghost" size="sm" className="col-span-2">
                    <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer">
                      Get a {provider.name} API key <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
