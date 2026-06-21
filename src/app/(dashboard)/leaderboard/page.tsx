"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";
import {
  Trophy, Layers, Gift, Crown, Boxes, Maximize2, Sparkles, BarChart3,
  Clock, ListOrdered, CalendarClock, Building2, Info, Globe2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MODELS } from "@/lib/models";
import {
  LEADERBOARD_ROWS, SCORING_WEIGHTS, BENCHMARKS, UPCOMING_MODELS,
  formatContext, type LeaderboardRow,
} from "@/lib/leaderboard";
import { useLeaderboardSync } from "@/components/leaderboard/use-leaderboard";
import { LiveSyncBadge } from "@/components/leaderboard/live-sync-badge";
import { StatStrip, type Stat } from "@/components/leaderboard/stat-strip";
import { Podium } from "@/components/leaderboard/podium";
import { RankingTable } from "@/components/leaderboard/ranking-table";
import { BenchmarkGrid } from "@/components/leaderboard/benchmark-grid";
import { UpcomingRadar } from "@/components/leaderboard/upcoming-radar";
import { ProviderBoard } from "@/components/leaderboard/provider-board";
import { ModelDetailDrawer } from "@/components/leaderboard/model-detail-drawer";
import { GlobalCatalog } from "@/components/leaderboard/global-catalog";

const RADAR_COLORS = ["#6366F1", "#A855F7", "#F59E0B", "#10B981", "#0EA5E9"];

const top3 = LEADERBOARD_ROWS.slice(0, 3);
const top5 = LEADERBOARD_ROWS.slice(0, 5);
const radarData = [
  { axis: "Quality",  ...Object.fromEntries(top5.map((r) => [r.model.name, r.quality])) },
  { axis: "Speed",    ...Object.fromEntries(top5.map((r) => [r.model.name, r.speed])) },
  { axis: "Context",  ...Object.fromEntries(top5.map((r) => [r.model.name, r.contextScore])) },
  { axis: "Openness", ...Object.fromEntries(top5.map((r) => [r.model.name, r.openness])) },
  { axis: "Value",    ...Object.fromEntries(top5.map((r) => [r.model.name, r.value])) },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function LeaderboardPage() {
  const sync = useLeaderboardSync();
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);

  const stats: Stat[] = useMemo(() => {
    const free = MODELS.filter((m) => m.free).length;
    const frontier = LEADERBOARD_ROWS.filter((r) => r.quality >= 85).length;
    const providers = new Set(MODELS.map((m) => m.provider)).size;
    const avgCtx = Math.round(MODELS.reduce((s, m) => s + m.context, 0) / MODELS.length / 1000);
    return [
      { label: "Models", value: MODELS.length, icon: Layers, tint: "text-violet-500" },
      { label: "Free", value: free, icon: Gift, tint: "text-emerald-500" },
      { label: "Frontier", value: frontier, icon: Crown, tint: "text-amber-500" },
      { label: "Providers", value: providers, icon: Boxes, tint: "text-sky-500" },
      { label: "Avg context", value: avgCtx, suffix: "K", icon: Maximize2, tint: "text-rose-500" },
      { label: "New / 45d", value: sync.newModels.length, icon: Sparkles, tint: "text-fuchsia-500" },
    ];
  }, [sync.newModels.length]);

  return (
    <div className="container max-w-7xl py-8">
      {/* Hero */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="inline-flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Global Leaderboard</span>
          </div>
          <LiveSyncBadge
            source={sync.source}
            updatedAt={sync.updatedAt}
            liveModelCount={sync.liveModelCount}
            refreshing={sync.refreshing}
            onRefresh={sync.refresh}
          />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          The <span className="brand-text">Global LLM</span> Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl text-fluid-lead">
          Every model in the LLMAtlas catalogue, ranked by a composite of quality, speed, context,
          openness and value — synced live with the OpenRouter catalogue and scored against industry
          benchmarks. Inspired by{" "}
          <a href="https://openrouter.ai/rankings" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            openrouter.ai/rankings
          </a>.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="mb-8"><StatStrip stats={stats} /></div>

      {/* Podium */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-10">
        <Podium top3={top3} onSelect={setSelected} />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="rankings" className="w-full">
        <TabsList className="mb-5 flex-wrap h-auto gap-1">
          <TabsTrigger value="rankings"><ListOrdered className="h-3.5 w-3.5 mr-1.5" />Rankings</TabsTrigger>
          <TabsTrigger value="global">
            <Globe2 className="h-3.5 w-3.5 mr-1.5" />
            <span>Global<span className="hidden sm:inline"> catalog</span></span>
            {sync.liveModelCount > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0 text-[10px] font-mono tabular-nums">
                {sync.liveModelCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="benchmarks"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Benchmarks</TabsTrigger>
          <TabsTrigger value="upcoming"><CalendarClock className="h-3.5 w-3.5 mr-1.5" />Upcoming</TabsTrigger>
          <TabsTrigger value="providers"><Building2 className="h-3.5 w-3.5 mr-1.5" />Providers</TabsTrigger>
        </TabsList>

        {/* RANKINGS */}
        <TabsContent value="rankings" className="space-y-6">
          <div className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Top 5 — capability radar</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      {top5.map((r, i) => (
                        <Radar key={r.model.id} dataKey={r.model.name} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.08} strokeWidth={2} />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-3">
                  {top5.map((r, i) => (
                    <button key={r.model.id} onClick={() => setSelected(r)} className="w-full flex items-center gap-2 text-xs hover:bg-accent/40 rounded px-1 py-0.5 transition-colors">
                      <span className="h-2 w-4 rounded-sm flex-shrink-0" style={{ backgroundColor: RADAR_COLORS[i] }} />
                      <span className="truncate text-muted-foreground flex-1 text-left">{r.model.name}</span>
                      <span className="font-semibold tabular-nums">{r.composite}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Methodology */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-base">Composite scoring methodology</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {SCORING_WEIGHTS.map(({ label, weight, color, desc }) => (
                  <div key={label} className="flex gap-3 text-xs items-start">
                    <div className={`h-3 w-3 rounded-sm flex-shrink-0 mt-0.5 ${color}`} />
                    <div>
                      <span className="font-semibold">{label} ({Math.round(weight * 100)}%)</span>
                      <p className="text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Newly detected on OpenRouter */}
          {sync.newModels.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-fuchsia-500" />
                  <span className="text-sm font-semibold">Recently added on OpenRouter</span>
                  <Badge variant="outline" className="text-[10px]">live</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sync.newModels.map((n, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs">
                      <span className="font-medium truncate max-w-[200px]">{n.name}</span>
                      <span className="text-muted-foreground">{n.vendor}</span>
                      {n.context > 0 && <span className="font-mono text-[10px] text-muted-foreground">{formatContext(n.context)}</span>}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <RankingTable rows={LEADERBOARD_ROWS} priceOverrides={sync.priceOverrides} onSelect={setSelected} />
        </TabsContent>

        {/* GLOBAL CATALOG — every model live on OpenRouter */}
        <TabsContent value="global">
          <GlobalCatalog globalModels={sync.globalModels} loading={sync.loading} />
        </TabsContent>

        {/* BENCHMARKS */}
        <TabsContent value="benchmarks" className="space-y-6">
          <BenchmarkGrid rows={LEADERBOARD_ROWS} onSelect={setSelected} />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" />Benchmark glossary</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {BENCHMARKS.map((b) => (
                <div key={b.key} className="text-xs">
                  <span className="font-semibold">{b.label}</span>
                  <span className="text-muted-foreground"> · {b.category}</span>
                  <p className="text-muted-foreground leading-relaxed mt-0.5">{b.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UPCOMING */}
        <TabsContent value="upcoming">
          <UpcomingRadar />
        </TabsContent>

        {/* PROVIDERS */}
        <TabsContent value="providers">
          <ProviderBoard />
        </TabsContent>
      </Tabs>

      {/* Disclosure footer */}
      <div className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          Composite scores and capability dimensions are approximate. Benchmark values are{" "}
          <span className="font-medium text-foreground">reported</span> from vendor cards & public evals where
          available, otherwise <span className="font-medium text-foreground">derived</span> from the composite and
          flagged accordingly. Usage share, tokens/week and weekly trend are{" "}
          <span className="font-medium text-foreground">modeled estimates</span> — OpenRouter does not expose
          per-model token volumes publicly. Model catalogue, pricing and context windows for OpenRouter models are
          synced live; {UPCOMING_MODELS.length} upcoming models are speculative projections.
        </p>
      </div>

      {/* Detail drawer */}
      <ModelDetailDrawer
        row={selected}
        priceOverride={selected ? sync.priceOverrides[selected.model.id] : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
