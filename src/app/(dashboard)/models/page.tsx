"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Database, Search, Zap, BarChart3, Sparkles, ArrowRight, X, ExternalLink,
  LayoutGrid, List, Eye, Code2, Brain, Star, Filter, KeyRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODELS, PROVIDERS, requiresApiKey, type ProviderId, type ModelSpec } from "@/lib/models";
import { cn } from "@/lib/utils";

type CapabilityTab = "all" | "free" | "vision" | "code" | "reasoning" | "fastest" | "frontier";
type ViewMode = "grid" | "list";

const CAPABILITY_TABS: { id: CapabilityTab; label: string; icon: React.ReactNode }[] = [
  { id: "all",       label: "All",       icon: <Database className="h-3 w-3" /> },
  { id: "free",      label: "Free",      icon: <Star className="h-3 w-3" /> },
  { id: "frontier",  label: "Frontier",  icon: <BarChart3 className="h-3 w-3" /> },
  { id: "fastest",   label: "Fastest",   icon: <Zap className="h-3 w-3" /> },
  { id: "vision",    label: "Vision",    icon: <Eye className="h-3 w-3" /> },
  { id: "code",      label: "Code",      icon: <Code2 className="h-3 w-3" /> },
  { id: "reasoning", label: "Reasoning", icon: <Brain className="h-3 w-3" /> },
];

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

function fmtCtx(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : `${Math.round(n / 1000)}K`;
}

export default function ModelsPage() {
  const [query,            setQuery]            = useState("");
  const [capFilter,        setCapFilter]        = useState<CapabilityTab>("all");
  const [vendorFilter,     setVendorFilter]     = useState<string | null>(null);
  const [providerFilter,   setProviderFilter]   = useState<ProviderId | null>(null);
  const [sortBy,           setSortBy]           = useState<"benchmark" | "speed" | "context">("benchmark");
  const [viewMode,         setViewMode]         = useState<ViewMode>("grid");
  const [showFilters,      setShowFilters]      = useState(false);

  const vendors = useMemo(() => Array.from(new Set(MODELS.map(m => m.vendor))).sort(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let list: ModelSpec[] = MODELS;

    // capability tab
    switch (capFilter) {
      case "free":      list = list.filter(m => m.free); break;
      case "frontier":  list = list.filter(m => (m.benchmark ?? 0) >= 85); break;
      case "fastest":   list = list.filter(m => (m.speedScore ?? 0) >= 90); break;
      case "vision":    list = list.filter(m => m.modalities.includes("vision")); break;
      case "code":      list = list.filter(m => m.tags.includes("code") || m.modalities.includes("code")); break;
      case "reasoning": list = list.filter(m => m.tags.some(t => ["reasoning", "thinking", "math"].includes(t))); break;
    }

    // advanced filters
    if (vendorFilter)   list = list.filter(m => m.vendor === vendorFilter);
    if (providerFilter) list = list.filter(m => m.provider === providerFilter);

    // text search
    if (q) list = list.filter(m =>
      m.name.toLowerCase().includes(q)       ||
      m.vendor.toLowerCase().includes(q)     ||
      m.tags.some(t => t.includes(q))        ||
      m.description.toLowerCase().includes(q)||
      PROVIDERS[m.provider].name.toLowerCase().includes(q),
    );

    // sort
    return list.sort((a, b) => {
      if (sortBy === "benchmark") return (b.benchmark ?? 0) - (a.benchmark ?? 0);
      if (sortBy === "speed")     return (b.speedScore ?? 0) - (a.speedScore ?? 0);
      return b.context - a.context;
    });
  }, [query, capFilter, vendorFilter, providerFilter, sortBy]);

  const hasActiveFilters = vendorFilter || providerFilter || query;

  function clearFilters() {
    setQuery("");
    setVendorFilter(null);
    setProviderFilter(null);
  }

  // stats
  const freeCount  = MODELS.filter(m => m.free).length;
  const visionCount = MODELS.filter(m => m.modalities.includes("vision")).length;

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Model Tracker</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Every LLM in one catalogue</h1>
        <p className="mt-2 text-muted-foreground">
          {MODELS.length} models across {PROVIDER_IDS.length} providers.{" "}
          <span className="text-emerald-600 font-medium">{freeCount} free</span> ·{" "}
          <span className="font-medium">{visionCount} vision-capable</span> ·{" "}
          all accessible today.
        </p>
      </div>

      {/* Capability tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CAPABILITY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCapFilter(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              capFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Controls bar */}
      <Card className="mb-5">
        <CardContent className="p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name, vendor, capability, description…"
                className="pl-9"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(v => !v)}
              className={cn("gap-1.5 text-xs", showFilters && "border-primary text-primary")}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Button>
            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1.5 transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1.5 transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Collapsible advanced filters */}
          {showFilters && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex flex-wrap gap-3">
                <FilterChips
                  label="Provider"
                  options={PROVIDER_IDS.map(p => ({ value: p, label: PROVIDERS[p].name }))}
                  selected={providerFilter}
                  onSelect={setProviderFilter}
                />
                <FilterChips
                  label="Vendor"
                  options={vendors.map(v => ({ value: v, label: v }))}
                  selected={vendorFilter}
                  onSelect={setVendorFilter}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Sort:
                  {(["benchmark", "speed", "context"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                        sortBy === s ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground">
                    <X className="h-3 w-3" /> Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {MODELS.length} models
        {capFilter !== "all" && (
          <span className="ml-2 text-xs">
            — filtered to <span className="font-medium text-foreground">{CAPABILITY_TABS.find(t => t.id === capFilter)?.label}</span>
          </span>
        )}
      </p>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No models match your filters.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid view */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <ModelCard key={m.id} model={m} index={i} />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Model</th>
                    <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Vendor</th>
                    <th className="px-3 py-3 font-medium text-center">Quality</th>
                    <th className="px-3 py-3 font-medium text-center">Speed</th>
                    <th className="px-3 py-3 font-medium text-center hidden lg:table-cell">Context</th>
                    <th className="px-3 py-3 font-medium text-center hidden lg:table-cell">Modalities</th>
                    <th className="px-3 py-3 font-medium text-center">Access</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const provider = PROVIDERS[m.provider];
                    return (
                      <tr
                        key={m.id}
                        className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-[190px]">
                            <div
                              className="h-7 w-7 rounded flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: provider.color }}
                            >
                              {provider.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.name}</p>
                              <p className="text-[11px] text-muted-foreground">{provider.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{m.vendor}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-mono tabular-nums">{m.benchmark ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-mono tabular-nums">{m.speedScore ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                          <span className="text-xs font-mono">{fmtCtx(m.context)}</span>
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {m.modalities.includes("vision") && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">👁</Badge>
                            )}
                            {m.tags.slice(0, 2).map(t => (
                              <Badge key={t} variant="outline" className="text-[9px] px-1 py-0">{t}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {m.tags?.includes("frontier-free") ? (
                              <Badge variant="frontier-free" className="text-[10px]">FRONTIER</Badge>
                            ) : (
                              <Badge variant={m.free ? "success" : "outline"} className="text-[10px]">
                                {m.free ? "FREE" : "PAID"}
                              </Badge>
                            )}
                            {requiresApiKey(m) && (
                              <span title="Requires your own API key (BYOK)" className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-0">
                                <KeyRound className="h-2.5 w-2.5" />KEY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Link href={`/playground?model=${m.id}`}>
                              <ArrowRight className="h-3.5 w-3.5" />
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
      )}
    </div>
  );
}

function ModelCard({ model: m, index: i }: { model: ModelSpec; index: number }) {
  const provider = PROVIDERS[m.provider];
  return (
    <div className="hover:-translate-y-0.5 transition-transform">
      <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all">
        <CardContent className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="h-9 w-9 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: provider.color }}
              >
                {provider.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate leading-tight">{m.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{m.vendor}</p>
              </div>
            </div>
            {m.tags?.includes("frontier-free") ? (
              <Badge variant="frontier-free" className="text-[10px] flex-shrink-0">FRONTIER</Badge>
            ) : (
              <Badge variant={m.free ? "success" : "outline"} className="text-[10px] flex-shrink-0">
                {m.free ? "FREE" : "PAID"}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
            {m.description}
          </p>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <MetricBox
              icon={<BarChart3 className="h-3 w-3 text-blue-500" />}
              label="Quality"
              value={m.benchmark != null ? String(m.benchmark) : "—"}
            />
            <MetricBox
              icon={<Zap className="h-3 w-3 text-amber-500" />}
              label="Speed"
              value={m.speedScore != null ? String(m.speedScore) : "—"}
            />
            <MetricBox
              icon={<Sparkles className="h-3 w-3 text-violet-500" />}
              label="Context"
              value={fmtCtx(m.context)}
            />
          </div>

          {/* Tags + modalities */}
          <div className="flex flex-wrap gap-1 mb-4">
            {m.modalities.includes("vision") && (
              <Badge variant="outline" className="text-[10px] gap-0.5">
                <Eye className="h-2.5 w-2.5" /> vision
              </Badge>
            )}
            {m.openSource && (
              <Badge variant="outline" className="text-[10px]">open-source</Badge>
            )}
            {m.tags.slice(0, 2).map(t => (
              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
            ))}
            {requiresApiKey(m) && (
              <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30">
                <KeyRound className="h-2.5 w-2.5" /> API key
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Button asChild variant="default" size="sm" className="flex-1 gap-1.5">
              <Link href={`/playground?model=${m.id}`}>
                <Sparkles className="h-3.5 w-3.5" /> Try
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={provider.getKeyUrl} target="_blank" rel="noreferrer">
                Key <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-muted/50 rounded-md py-2 gap-0.5">
      {icon}
      <div className="font-semibold text-sm tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterChips<T extends string>({
  label, options, selected, onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (v: T | null) => void;
}) {
  return (
    <div className="flex items-start gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1 mt-1">{label}:</span>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(selected === o.value ? null : o.value)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors",
            selected === o.value
              ? "bg-primary text-primary-foreground border-primary"
              : "hover:bg-accent",
          )}
        >
          {o.label}
          {selected === o.value && <X className="h-3 w-3" />}
        </button>
      ))}
    </div>
  );
}
