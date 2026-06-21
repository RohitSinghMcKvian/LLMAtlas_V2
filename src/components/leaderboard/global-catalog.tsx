"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search, Globe2, Sparkles, Eye, Code2, Brain, KeyRound, ArrowUpRight,
  ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, Check,
  ListOrdered, BarChart3, Layers3,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlobalBenchmarkGrid } from "./global-benchmark-grid";
import { GlobalCategories } from "./global-categories";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  type GlobalRow, type GlobalFilter,
  GLOBAL_FILTERS, matchesGlobal, aggregateGlobalVendors,
} from "@/lib/global-leaderboard";
import {
  type GlobalModelLite, type BenchKey,
  BENCHMARKS, BENCHMARK_BY_KEY, formatContext, formatPrice,
} from "@/lib/leaderboard";
import { ScoreBar } from "./score-bar";
import { cn } from "@/lib/utils";

const INITIAL_LIMIT = 50;

type SortCol = "composite" | "quality" | "context" | "value";
type SortDir = "asc" | "desc";

// ─── Vendor color (deterministic, no provider registry available) ───────────
function vendorColor(v: string): string {
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
}

function normalize(key: BenchKey, v: number): number {
  if (key === "arenaElo") return Math.max(0, Math.min(100, ((v - 1000) / (1480 - 1000)) * 100));
  return Math.max(0, Math.min(100, (v / BENCHMARK_BY_KEY[key].max) * 100));
}

// ─── Detail drawer for a global model ──────────────────────────────────────
function GlobalDetailDrawer({
  row, rank, total, onClose,
}: { row: GlobalRow | null; rank: number; total: number; onClose: () => void }) {
  const g = row?.model;
  const color = g ? vendorColor(g.vendor) : "#888";
  const radar = row
    ? BENCHMARKS.filter((bm) => row.bench[bm.key] != null).map((bm) => ({
        axis: bm.short, value: normalize(bm.key, row.bench[bm.key]!),
      }))
    : [];
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl !p-0">
        {row && g && (
          <div className="h-full overflow-y-auto">
            <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
            <div className="p-6 space-y-6">
              <SheetHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="research" className="text-[10px]">#{rank} of {total}</Badge>
                  {g.inputPrice === 0
                    ? <Badge variant="success" className="text-[10px]">FREE</Badge>
                    : <Badge variant="outline" className="text-[10px]">${g.inputPrice.toFixed(2)}/M</Badge>}
                  {g.inCatalog && <Badge variant="default" className="text-[10px]">In LLMAtlas</Badge>}
                  {g.modalities.includes("vision") && (
                    <Badge variant="outline" className="text-[10px] gap-0.5"><Eye className="h-2.5 w-2.5" />Vision</Badge>
                  )}
                </div>
                <SheetTitle className="text-2xl leading-tight">{g.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{g.vendor}</p>
              </SheetHeader>

              <div className="flex items-end gap-4 rounded-xl glass-card p-4">
                <div>
                  <div className="text-4xl font-bold tabular-nums leading-none brand-text">{row.composite}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Composite</div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-lg font-bold tabular-nums">{row.quality}</div><div className="text-[10px] text-muted-foreground">Quality</div></div>
                  <div><div className="text-lg font-bold tabular-nums">{row.speed}</div><div className="text-[10px] text-muted-foreground">Speed</div></div>
                  <div><div className="text-lg font-bold tabular-nums">{row.contextScore}</div><div className="text-[10px] text-muted-foreground">Context</div></div>
                </div>
              </div>

              {radar.length >= 3 && (
                <div>
                  <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    Benchmark profile
                    <Badge variant={row.benchReported ? "success" : "outline"} className="text-[9px]">
                      {row.benchReported ? "reported" : "estimated"}
                    </Badge>
                  </h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radar} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2">Benchmark scores</h3>
                <div className="space-y-2">
                  {BENCHMARKS.map((bm) => {
                    const v = row.bench[bm.key];
                    return (
                      <div key={bm.key} className="flex items-center gap-3 text-xs" title={bm.description}>
                        <span className="w-20 text-muted-foreground flex-shrink-0">{bm.short}</span>
                        {v == null ? (
                          <span className="text-muted-foreground/50 flex-1">—</span>
                        ) : (
                          <>
                            <ScoreBar value={normalize(bm.key, v)} color="violet" showValue={false} estimated={!row.benchReported} />
                            <span className="font-mono tabular-nums w-12 text-right">
                              {Math.round(v)}{bm.key === "arenaElo" ? "" : "%"}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Specs</h3>
                <div className="text-sm divide-y divide-border/60">
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Context window</span><span className="font-medium">{formatContext(g.context)}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Input price</span><span className="font-medium">{g.inputPrice === 0 ? "Free" : `${formatPrice(g.inputPrice)}/1M`}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Output price</span><span className="font-medium">{g.outputPrice === 0 ? "Free" : `${formatPrice(g.outputPrice)}/1M`}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Modalities</span><span className="font-medium">{g.modalities.join(", ")}</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-muted-foreground">OpenRouter id</span><span className="font-mono text-xs truncate max-w-[220px]">{g.id}</span></div>
                  {g.created > 0 && (
                    <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Released</span><span className="font-medium">{new Date(g.created * 1000).toISOString().slice(0, 10)}</span></div>
                  )}
                </div>
              </div>

              {row.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {row.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
              )}

              {g.description && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{g.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-2">
                <Button asChild variant="brand" size="sm">
                  <a href={`https://openrouter.ai/${g.id}`} target="_blank" rel="noopener noreferrer">
                    Open on OpenRouter <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {g.inCatalog && (
                  <Button asChild variant="outline" size="sm">
                    <a href="/playground">Try in Playground <ArrowUpRight className="h-3.5 w-3.5" /></a>
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

// ─── Main component ─────────────────────────────────────────────────────────
interface GlobalCatalogProps {
  globalModels: GlobalModelLite[];
  loading: boolean;
}

export function GlobalCatalog({ globalModels, loading }: GlobalCatalogProps) {
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<GlobalRow[]>([]);
  const [filter, setFilter] = useState<GlobalFilter>("all");
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [selected, setSelected] = useState<GlobalRow | null>(null);

  // Compute rows asynchronously to keep the UI snappy on first paint.
  useEffect(() => {
    let cancelled = false;
    if (globalModels.length === 0) { setRows([]); return; }
    (async () => {
      const { computeGlobalRows } = await import("@/lib/global-leaderboard");
      if (cancelled) return;
      setRows(computeGlobalRows(globalModels));
    })();
    return () => { cancelled = true; };
  }, [globalModels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!matchesGlobal(r, filter)) return false;
      if (!q) return true;
      const g = r.model;
      return g.name.toLowerCase().includes(q)
        || g.vendor.toLowerCase().includes(q)
        || g.id.toLowerCase().includes(q)
        || r.tags.some((t) => t.includes(q));
    });
    return [...list].sort((a, b) => {
      const va = sortCol === "composite" ? a.composite
        : sortCol === "quality" ? a.quality
        : sortCol === "context" ? a.contextScore
        : a.value;
      const vb = sortCol === "composite" ? b.composite
        : sortCol === "quality" ? b.quality
        : sortCol === "context" ? b.contextScore
        : b.value;
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [rows, filter, query, sortCol, sortDir]);

  const visible = filtered.slice(0, limit);

  const stats = useMemo(() => {
    const free = rows.filter((r) => r.model.inputPrice === 0).length;
    const frontier = rows.filter((r) => r.quality >= 85).length;
    const vision = rows.filter((r) => r.model.modalities.includes("vision")).length;
    const inCat = rows.filter((r) => r.model.inCatalog).length;
    const vendors = new Set(rows.map((r) => r.model.vendor)).size;
    return { free, frontier, vision, inCat, vendors };
  }, [rows]);

  const vendors = useMemo(() => aggregateGlobalVendors(rows).slice(0, 10), [rows]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  if (loading && rows.length === 0) {
    return (
      <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
        <Globe2 className="h-8 w-8 mx-auto mb-3 animate-pulse text-primary" />
        Syncing the global LLM universe from OpenRouter…
      </CardContent></Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed"><CardContent className="p-12 text-center text-sm text-muted-foreground">
        Live global catalogue unavailable — falling back to the LLMAtlas-bundled rankings.
        Refresh the page once your connection is back to load the full universe of models.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div className="rounded-xl glass-card p-4 sm:p-5 brand-border overflow-hidden relative">
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 grid place-items-center flex-shrink-0">
              <Globe2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">The Global LLM Universe</h2>
              <p className="text-xs text-muted-foreground">
                Every model live on OpenRouter — auto-derived benchmark profiles for the world's LLMs.
              </p>
            </div>
          </div>
          <div className="sm:ml-auto grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
            {[
              { l: "Models",   v: rows.length },
              { l: "Vendors",  v: stats.vendors },
              { l: "Free",     v: stats.free },
              { l: "Frontier", v: stats.frontier },
              { l: "Vision",   v: stats.vision },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-xl font-bold tabular-nums brand-text">{s.v}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vendor strip */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-2 pb-1 min-w-min">
          {vendors.map((v) => (
            <motion.div
              key={v.vendor}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-[180px] rounded-lg glass-card p-2.5 card-hover"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: vendorColor(v.vendor) }} />
                <span className="text-xs font-semibold truncate flex-1">{v.vendor}</span>
                <span className="text-[10px] text-muted-foreground">{v.count}</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate" title={v.best.model.name}>
                Top: {v.best.model.name}
              </div>
              <div className="mt-1.5"><ScoreBar value={v.avgQuality} color="violet" showValue /></div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="rankings" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="rankings"><ListOrdered className="h-3.5 w-3.5 mr-1.5" />Rankings</TabsTrigger>
          <TabsTrigger value="benchmarks"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Benchmarks</TabsTrigger>
          <TabsTrigger value="categories"><Layers3 className="h-3.5 w-3.5 mr-1.5" />Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-5">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative sm:max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(INITIAL_LIMIT); }}
            placeholder="Search 340+ models, vendors, tags…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto overflow-x-auto">
          {GLOBAL_FILTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setFilter(c.id); setLimit(INITIAL_LIMIT); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                filter === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >{c.label}</button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {Math.min(limit, filtered.length)} of {filtered.length} models · live from OpenRouter
      </p>

      {/* Mobile cards */}
      <div className="grid sm:hidden gap-2">
        {visible.map((r, i) => {
          const g = r.model;
          return (
            <motion.button
              key={g.id}
              type="button"
              onClick={() => setSelected(r)}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.2) }}
              className="text-left w-full"
            >
              <Card className="card-hover overflow-hidden">
                <div className="h-1" style={{ backgroundColor: vendorColor(g.vendor) }} />
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{g.vendor}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold tabular-nums leading-none">{r.composite}</div>
                      <div className="text-[9px] text-muted-foreground">#{i + 1}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground mb-2">
                    <span>Q <span className="font-bold text-foreground tabular-nums">{r.quality}</span></span>
                    <span>S <span className="font-bold text-foreground tabular-nums">{r.speed}</span></span>
                    <span>Ctx <span className="font-bold text-foreground font-mono">{formatContext(g.context)}</span></span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.inputPrice === 0
                      ? <Badge variant="success" className="text-[9px] px-1 py-0">FREE</Badge>
                      : <Badge variant="outline" className="text-[9px] px-1 py-0">${g.inputPrice.toFixed(2)}/M</Badge>}
                    {g.inCatalog && <Badge variant="default" className="text-[9px] px-1 py-0">In LLMAtlas</Badge>}
                    {g.modalities.includes("vision") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Eye className="h-2 w-2" />vision</Badge>}
                    {r.tags.includes("reasoning") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Brain className="h-2 w-2" />reasoning</Badge>}
                    {r.tags.includes("code") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Code2 className="h-2 w-2" />code</Badge>}
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 w-12 font-medium">#</th>
                  <th className="text-left px-3 py-3 font-medium">Model</th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("composite")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Composite <SortIcon active={sortCol === "composite"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground hidden md:table-cell"
                    onClick={() => handleSort("quality")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Quality <SortIcon active={sortCol === "quality"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground hidden lg:table-cell"
                    onClick={() => handleSort("context")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Context <SortIcon active={sortCol === "context"} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground hidden md:table-cell"
                    onClick={() => handleSort("value")}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Price <SortIcon active={sortCol === "value"} dir={sortDir} />
                    </span>
                  </th>
                  <th className="px-3 py-3 font-medium text-center hidden lg:table-cell">Tags</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const g = r.model;
                  return (
                    <motion.tr
                      key={g.id}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.005, 0.2) }}
                      onClick={() => setSelected(r)}
                      className="border-b last:border-0 hover:bg-accent/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <div
                            className="h-7 w-7 rounded flex-shrink-0 grid place-items-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: vendorColor(g.vendor) }}
                          >
                            {g.vendor.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-tight truncate flex items-center gap-1.5">
                              {g.name}
                              {g.inCatalog && <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{g.vendor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><ScoreBar value={r.composite} color="violet" /></td>
                      <td className="px-3 py-2.5 hidden md:table-cell"><ScoreBar value={r.quality} color="blue" /></td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                        <span className="text-xs font-mono tabular-nums">{formatContext(g.context)}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-center">
                        {g.inputPrice === 0
                          ? <Badge variant="success" className="text-[10px]">FREE</Badge>
                          : <span className="text-xs font-mono tabular-nums">${g.inputPrice.toFixed(2)}/M</span>}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                          {g.modalities.includes("vision") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Eye className="h-2 w-2" />vis</Badge>}
                          {r.tags.includes("reasoning") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Brain className="h-2 w-2" />reason</Badge>}
                          {r.tags.includes("code") && <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5"><Code2 className="h-2 w-2" />code</Badge>}
                          {r.benchReported && <Badge variant="success" className="text-[9px] px-1 py-0 gap-0.5"><Sparkles className="h-2 w-2" />real</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground inline" />
                      </td>
                    </motion.tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No models match your filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {limit < filtered.length && (
        <div className="text-center">
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="text-xs font-medium px-4 py-2 rounded-md bg-muted/60 hover:bg-muted transition-colors tap-target"
          >
            Show {Math.min(50, filtered.length - limit)} more · {filtered.length - limit} hidden
          </button>
        </div>
      )}
        </TabsContent>

        <TabsContent value="benchmarks">
          <GlobalBenchmarkGrid rows={rows} onSelect={setSelected} />
        </TabsContent>

        <TabsContent value="categories">
          <GlobalCategories rows={rows} onSelect={setSelected} />
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
        <KeyRound className="h-3 w-3 mt-0.5 flex-shrink-0" />
        Global catalogue is synced live from OpenRouter (a free, open API aggregating most public LLMs).
        Composite, quality and benchmark profiles are derived from each model's name pattern, vendor reputation,
        pricing tier and context window — flagged "estimated" unless the model is in our curated benchmark set.
      </p>

      <GlobalDetailDrawer
        row={selected}
        rank={selected ? filtered.indexOf(selected) + 1 : 0}
        total={filtered.length}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
