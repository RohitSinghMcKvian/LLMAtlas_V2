"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy, Zap, BarChart3, Sparkles, ArrowRight, Eye, Code2, Brain,
  Star, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpRight, KeyRound,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODELS, PROVIDERS, requiresApiKey, type ModelSpec } from "@/lib/models";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "free" | "frontier" | "fastest" | "vision" | "code" | "reasoning";
type SortCol = "composite" | "quality" | "speed" | "contextScore" | "openness" | "value";
type SortDir = "asc" | "desc";

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: "all",       label: "All",       icon: <Sparkles className="h-3 w-3" /> },
  { id: "free",      label: "Free",      icon: <Star className="h-3 w-3" /> },
  { id: "frontier",  label: "Frontier",  icon: <BarChart3 className="h-3 w-3" /> },
  { id: "fastest",   label: "Fastest",   icon: <Zap className="h-3 w-3" /> },
  { id: "vision",    label: "Vision",    icon: <Eye className="h-3 w-3" /> },
  { id: "code",      label: "Code",      icon: <Code2 className="h-3 w-3" /> },
  { id: "reasoning", label: "Reasoning", icon: <Brain className="h-3 w-3" /> },
];

interface LeaderboardRow {
  model: ModelSpec;
  quality: number;
  speed: number;
  contextScore: number;
  openness: number;
  value: number;
  composite: number;
}

function computeRow(m: ModelSpec): LeaderboardRow {
  const quality = m.benchmark ?? 50;
  const speed = m.speedScore ?? 50;
  // log-scale: 2M ctx = 100, 1M = ~91, 128K = ~64, 8K = ~28
  const contextScore = Math.min(100, Math.max(0, Math.round(
    (Math.log(m.context / 1000) / Math.log(2000)) * 100,
  )));
  const openness = m.openSource ? 100 : 30;
  const value = m.free ? 100 : m.inputPrice < 0.5 ? 72 : m.inputPrice < 2 ? 50 : 28;
  const composite = Math.round(
    quality * 0.35 + speed * 0.20 + contextScore * 0.15 + openness * 0.15 + value * 0.15,
  );
  return { model: m, quality, speed, contextScore, openness, value, composite };
}

const ALL_ROWS: LeaderboardRow[] = MODELS.map(computeRow);
const RADAR_COLORS = ["#0EA5E9", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444"];

function getSortVal(r: LeaderboardRow, col: SortCol): number {
  switch (col) {
    case "composite":    return r.composite;
    case "quality":      return r.quality;
    case "speed":        return r.speed;
    case "contextScore": return r.contextScore;
    case "openness":     return r.openness;
    case "value":        return r.value;
  }
}

function SortIcon({
  col, sortCol, sortDir,
}: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "desc"
    ? <ChevronDown className="h-3 w-3" />
    : <ChevronUp className="h-3 w-3" />;
}

function ScoreBar({ value, color }: { value: number; color: "violet" | "blue" | "amber" | "green" | "rose" }) {
  const colorMap = {
    violet: "bg-violet-500",
    blue:   "bg-blue-500",
    amber:  "bg-amber-500",
    green:  "bg-emerald-500",
    rose:   "bg-rose-500",
  };
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorMap[color])} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono w-6 tabular-nums">{value}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [filter, setFilter]   = useState<FilterTab>("all");
  const [sortCol, setSortCol] = useState<SortCol>("composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    let list = ALL_ROWS;
    switch (filter) {
      case "free":      list = list.filter(r => r.model.free); break;
      case "frontier":  list = list.filter(r => r.quality >= 85); break;
      case "fastest":   list = list.filter(r => r.speed >= 90); break;
      case "vision":    list = list.filter(r => r.model.modalities.includes("vision")); break;
      case "code":      list = list.filter(r => r.model.tags.includes("code") || r.model.modalities.includes("code")); break;
      case "reasoning": list = list.filter(r => r.model.tags.some(t => ["reasoning", "thinking", "math"].includes(t))); break;
    }
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? getSortVal(b, sortCol) - getSortVal(a, sortCol)
        : getSortVal(a, sortCol) - getSortVal(b, sortCol),
    );
  }, [filter, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  // Podium always based on all-time composite top3
  const top3 = useMemo(() => [...ALL_ROWS].sort((a, b) => b.composite - a.composite).slice(0, 3), []);
  const top5 = useMemo(() => [...ALL_ROWS].sort((a, b) => b.composite - a.composite).slice(0, 5), []);

  const radarData = [
    { axis: "Quality",  ...Object.fromEntries(top5.map(r => [r.model.name, r.quality])) },
    { axis: "Speed",    ...Object.fromEntries(top5.map(r => [r.model.name, r.speed])) },
    { axis: "Context",  ...Object.fromEntries(top5.map(r => [r.model.name, r.contextScore])) },
    { axis: "Openness", ...Object.fromEntries(top5.map(r => [r.model.name, r.openness])) },
    { axis: "Value",    ...Object.fromEntries(top5.map(r => [r.model.name, r.value])) },
  ];

  const medals = ["🥇", "🥈", "🥉"];
  const podiumOrder = [1, 0, 2]; // silver | gold | bronze left-to-right
  const podiumOffsets = ["translate-y-2", "-translate-y-4", "translate-y-4"];

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Public Leaderboard</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">The free model leaderboard</h1>
        <p className="mt-2 text-muted-foreground">
          Composite scoring across quality, speed, context, openness, and cost-efficiency.
          <span className="text-xs ml-2 bg-muted rounded px-1.5 py-0.5">{MODELS.length} models ranked</span>
        </p>
      </div>

      {/* Podium — top 3 */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 mb-10">
        {podiumOrder.map((idx, pos) => {
          const r = top3[idx];
          const m = r.model;
          const provider = PROVIDERS[m.provider];
          return (
            <div
              key={m.id}
              className={podiumOffsets[idx]}
            >
              <Card className={cn(
                "h-full overflow-hidden",
                idx === 0 && "ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10",
              )}>
                <div className="h-1.5" style={{ backgroundColor: provider.color }} />
                <CardContent className="p-5 text-center">
                  <div className="text-4xl mb-2">{medals[idx]}</div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">
                    #{idx + 1} · Composite {r.composite}
                  </div>
                  <h3 className="font-bold text-base mb-1 truncate">{m.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{m.vendor} · {provider.name}</p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-blue-500" />{r.quality}</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{r.speed}</span>
                  </div>
                  <div className="flex justify-center gap-1 mb-3 flex-wrap">
                    {m.free && <Badge variant="success" className="text-[10px]">FREE</Badge>}
                    {m.openSource && <Badge variant="outline" className="text-[10px]">Open</Badge>}
                    {requiresApiKey(m) && (
                      <span title="Requires your own API key" className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded px-1.5 py-0.5">
                        <KeyRound className="h-2.5 w-2.5" />KEY
                      </span>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/playground?model=${m.id}`}>Try it <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Radar + Score Legend */}
      <div className="grid lg:grid-cols-5 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 — Capability Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {top5.map((r, i) => (
                    <Radar
                      key={r.model.id}
                      dataKey={r.model.name}
                      stroke={RADAR_COLORS[i]}
                      fill={RADAR_COLORS[i]}
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-3">
              {top5.map((r, i) => (
                <div key={r.model.id} className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-4 rounded-sm flex-shrink-0" style={{ backgroundColor: RADAR_COLORS[i] }} />
                  <span className="truncate text-muted-foreground flex-1">{r.model.name}</span>
                  <span className="font-semibold tabular-nums">{r.composite}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scoring Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              {
                label: "Quality (35%)", color: "bg-blue-500",
                desc: "Composite benchmark — MMLU, MATH, HumanEval, and reasoning benchmarks. Sourced from model cards and third-party evaluations.",
              },
              {
                label: "Speed (20%)", color: "bg-amber-500",
                desc: "Throughput score based on provider hardware. Groq & Cerebras top the charts with LPU silicon. Higher = faster streaming UX.",
              },
              {
                label: "Context (15%)", color: "bg-violet-500",
                desc: "Log-normalized context window. 2M tokens = 100, 1M ≈ 91, 128K ≈ 64, 8K ≈ 28. Larger windows unlock long-document RAG.",
              },
              {
                label: "Openness (15%)", color: "bg-emerald-500",
                desc: "100 for fully open-source weights (MIT/Apache). 30 for closed/proprietary. Open-source = reproducible, auditable, self-hostable.",
              },
              {
                label: "Value (15%)", color: "bg-rose-500",
                desc: "100 for completely free tiers. Scaled inversely with price per token. Free APIs score 100; GPT-4o class scores ~28.",
              },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex gap-3 text-xs items-start">
                <div className={cn("h-3 w-3 rounded-sm flex-shrink-0 mt-0.5", color)} />
                <div>
                  <span className="font-semibold">{label}</span>
                  <p className="text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">{rows.length} models</span>
      </div>

      {/* Sortable table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 w-10 font-medium">#</th>
                  <th className="text-left px-3 py-3 font-medium">Model</th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("composite")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Composite <SortIcon col="composite" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("quality")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Quality <SortIcon col="quality" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("speed")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Speed <SortIcon col="speed" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("contextScore")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Context <SortIcon col="contextScore" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className="px-3 py-3 font-medium text-center hidden lg:table-cell">Tags</th>
                  <th className="px-3 py-3 font-medium text-center">Access</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = r.model;
                  const provider = PROVIDERS[m.provider];
                  return (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[190px]">
                          <div
                            className="h-7 w-7 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: provider.color }}
                          >
                            {provider.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate leading-tight">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.vendor} · {provider.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ScoreBar value={r.composite} color="violet" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ScoreBar value={r.quality} color="blue" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ScoreBar value={r.speed} color="amber" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-mono tabular-nums">
                          {m.context >= 1_000_000
                            ? `${(m.context / 1_000_000).toFixed(1)}M`
                            : `${Math.round(m.context / 1000)}K`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 justify-center max-w-[160px]">
                          {m.modalities.includes("vision") && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">👁 vision</Badge>
                          )}
                          {m.tags.slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-[9px] px-1 py-0">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant={m.free ? "success" : "outline"} className="text-[10px]">
                            {m.free ? "FREE" : "PAID"}
                          </Badge>
                          {requiresApiKey(m) && (
                            <span title="Requires your own API key — add in Settings" className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-0">
                              <KeyRound className="h-2.5 w-2.5" />KEY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Link href={`/playground?model=${m.id}`}>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Scores are approximate. Quality based on published benchmarks; speed on measured throughput; context on token limit. Click any column header to sort.
      </p>
    </div>
  );
}
