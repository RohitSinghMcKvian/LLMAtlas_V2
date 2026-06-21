"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, KeyRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PROVIDERS, requiresApiKey } from "@/lib/models";
import {
  type LeaderboardRow, type CategoryFilter, type SortCol, type PriceOverride,
  CATEGORY_FILTERS, matchesCategory, sortValue, formatContext, formatTokens,
} from "@/lib/leaderboard";
import { ScoreBar } from "./score-bar";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";
const INITIAL_LIMIT = 50;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
}

function Th({
  label, col, sortCol, sortDir, onSort, className,
}: {
  label: string; col: SortCol; sortCol: SortCol; sortDir: SortDir;
  onSort: (c: SortCol) => void; className?: string;
}) {
  return (
    <th
      className={cn("px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground", className)}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1 justify-center">
        {label} <SortIcon active={sortCol === col} dir={sortDir} />
      </span>
    </th>
  );
}

function TrendArrow({ trend }: { trend: number }) {
  const flat = trend === 0, up = trend > 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      title={`${up ? "+" : ""}${trend} rank-points this week (estimated)`}
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
        flat ? "text-muted-foreground" : up ? "text-emerald-500" : "text-rose-500",
      )}
    >
      <Icon className="h-3 w-3" />{Math.abs(trend)}
    </span>
  );
}

export function RankingTable({
  rows, priceOverrides, onSelect,
}: {
  rows: LeaderboardRow[];
  priceOverrides: Record<string, PriceOverride>;
  onSelect: (r: LeaderboardRow) => void;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const maxUsage = useMemo(() => Math.max(...rows.map((r) => r.usageShare), 0.001), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!matchesCategory(r, filter)) return false;
      if (!q) return true;
      const m = r.model;
      return (
        m.name.toLowerCase().includes(q) ||
        m.vendor.toLowerCase().includes(q) ||
        PROVIDERS[m.provider].name.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
      );
    });
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? sortValue(b, sortCol) - sortValue(a, sortCol)
        : sortValue(a, sortCol) - sortValue(b, sortCol),
    );
  }, [rows, filter, query, sortCol, sortDir]);

  const visible = filtered.slice(0, limit);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative sm:max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(INITIAL_LIMIT); }}
            placeholder="Search models, vendors, tags…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setFilter(c.id); setLimit(INITIAL_LIMIT); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {Math.min(limit, filtered.length)} of {filtered.length} models · ranked by{" "}
        <span className="font-medium text-foreground">{sortCol === "usageShare" ? "usage" : sortCol}</span>
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 w-12 font-medium">#</th>
                  <th className="text-left px-3 py-3 font-medium">Model</th>
                  <Th label="Usage" col="usageShare" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Composite" col="composite" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  <Th label="Quality" col="quality" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                  <Th label="Speed" col="speed" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                  <Th label="Context" col="contextScore" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                  <th className="px-3 py-3 font-medium text-center">Access</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const m = r.model;
                  const provider = PROVIDERS[m.provider];
                  const ctx = priceOverrides[m.id]?.context ?? m.context;
                  return (
                    <motion.tr
                      key={m.id}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.008, 0.3) }}
                      onClick={() => onSelect(r)}
                      className="border-b last:border-0 hover:bg-accent/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}</span>
                          <TrendArrow trend={r.trend} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <div
                            className="h-7 w-7 rounded flex-shrink-0 grid place-items-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: provider.color }}
                          >
                            {provider.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm leading-tight truncate">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.vendor} · {provider.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[120px]" title="Estimated weekly usage share">
                          <ScoreBar value={r.usageShare} max={maxUsage} color="sky" showValue={false} />
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-14 text-right">
                            {formatTokens(r.tokensPerWeek)}/wk
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><ScoreBar value={r.composite} color="violet" /></td>
                      <td className="px-3 py-2.5 hidden sm:table-cell"><ScoreBar value={r.quality} color="blue" /></td>
                      <td className="px-3 py-2.5 hidden md:table-cell"><ScoreBar value={r.speed} color="amber" /></td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-center">
                        <span className="text-xs font-mono tabular-nums">{formatContext(ctx)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant={m.free ? "success" : "outline"} className="text-[10px]">
                            {m.free ? "FREE" : "PAID"}
                          </Badge>
                          {requiresApiKey(m) && (
                            <span title="Requires your own API key" className="text-amber-500"><KeyRound className="h-3 w-3" /></span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground inline" />
                      </td>
                    </motion.tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
            className="text-xs font-medium px-4 py-2 rounded-md bg-muted/60 hover:bg-muted transition-colors"
          >
            Show {Math.min(50, filtered.length - limit)} more ({filtered.length - limit} hidden)
          </button>
        </div>
      )}
    </div>
  );
}
