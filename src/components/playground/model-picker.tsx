"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, Zap, BarChart3, Sparkles, Eye, Code2, Brain, Star, KeyRound } from "lucide-react";
import { MODELS, PROVIDERS, requiresApiKey, type ModelSpec, type ProviderId } from "@/lib/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "fastest" | "frontier" | "vision" | "code" | "reasoning" | "free";

interface Props {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: "all",       label: "All",      icon: <Sparkles className="h-3 w-3" /> },
  { id: "free",      label: "Free",     icon: <Star className="h-3 w-3" /> },
  { id: "frontier",  label: "Frontier", icon: <BarChart3 className="h-3 w-3" /> },
  { id: "fastest",   label: "Fastest",  icon: <Zap className="h-3 w-3" /> },
  { id: "vision",    label: "Vision",   icon: <Eye className="h-3 w-3" /> },
  { id: "code",      label: "Code",     icon: <Code2 className="h-3 w-3" /> },
  { id: "reasoning", label: "Reasoning",icon: <Brain className="h-3 w-3" /> },
];

// Models released within last 60 days (approx) relative to 2026-05
const NEW_IDS = new Set([
  "google-gemini-2.5-pro", "google-gemini-2.5-flash", "nv-deepseek-r1-0528",
  "or-qwen3-235b-free", "or-qwen3-32b-free", "or-qwen3-14b-free", "or-qwen3-8b-free",
  "cerebras-qwen-3-32b", "nv-qwen3-next-80b", "or-kimi-k2-free", "or-kimi-vl-thinking-free",
  "or-deepseek-v4-free", "nv-deepseek-r1-0528", "or-llama-4-scout-free",
  // Jun 2026 expansion
  "ds-v4-pro", "ds-v4", "ds-r1-0528", "ds-coder-v3",
  "or-deepseek-v4-pro", "or-deepseek-r1", "or-deepseek-r1-0528", "or-deepseek-v3.2",
  "or-kimi-k2.5", "or-kimi-k2-thinking",
  "or-minimax-m2.7", "or-minimax-m3",
  "or-mimo-v2.5", "or-mimo-v2.5-pro",
  "or-qwen-3.6-flash", "or-qwen-3.6-plus", "or-qwen3-coder-flash", "or-hy3",
  "or-llama-4-maverick", "or-llama-4-scout",
  "gh-claude-opus-4", "gh-claude-sonnet-4.5", "gh-o3", "gh-o4-mini", "gh-gpt-4.5",
  "gh-deepseek-r1", "gh-deepseek-v4-pro",
  "nv-deepseek-v4-pro", "nv-mimo-2.5", "nv-kimi-k2", "nv-qwen-3.6",
  "together-deepseek-v4-pro", "together-qwen-3.6",
  "cerebras-deepseek-r1-qwen-32b",
  // Keyless frontier via Pollinations
  "poll-claude-opus-4.8", "poll-claude", "poll-gpt-5.5", "poll-gpt-5.4-mini", "poll-openai-large",
  "poll-deepseek-pro", "poll-deepseek", "poll-kimi-k2.6", "poll-minimax-m3",
  "poll-qwen-large", "poll-qwen-coder", "poll-qwen-vision", "poll-grok-4.3",
  "poll-llama-maverick", "poll-llama-scout", "poll-glm", "poll-mistral-large", "poll-gemini-3.5-flash",
]);

export function ModelPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const current = MODELS.find((m) => m.id === value);

  const filtered = useMemo(() => {
    let list = MODELS;

    // Apply capability filter
    switch (activeFilter) {
      case "free":      list = list.filter(m => m.free); break;
      case "frontier":  list = list.filter(m => (m.benchmark ?? 0) >= 85); break;
      case "fastest":   list = list.filter(m => (m.speedScore ?? 0) >= 90); break;
      case "vision":    list = list.filter(m => m.modalities.includes("vision")); break;
      case "code":      list = list.filter(m => m.tags.includes("code") || m.modalities.includes("code")); break;
      case "reasoning": list = list.filter(m => m.tags.some(t => ["reasoning", "thinking", "math"].includes(t))); break;
    }

    // Apply text search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.vendor.toLowerCase().includes(q) ||
        PROVIDERS[m.provider].name.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q)) ||
        m.description.toLowerCase().includes(q)
      );
    }

    return list;
  }, [query, activeFilter]);

  // Group by provider
  const grouped = useMemo(() => {
    const order: ProviderId[] = ["groq", "cerebras", "deepseek", "google", "nvidia", "openrouter", "github-models", "mistral", "together", "xai", "pollinations", "cloudflare", "huggingface"];
    const map = new Map<ProviderId, ModelSpec[]>();
    for (const m of filtered) {
      if (!map.has(m.provider)) map.set(m.provider, []);
      map.get(m.provider)!.push(m);
    }
    return order.filter(p => map.has(p)).map(p => ({ provider: p, models: map.get(p)! }));
  }, [filtered]);

  const freeCount = MODELS.filter(m => m.free).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border bg-card hover:bg-accent px-3 py-2 text-sm font-medium transition-colors w-full sm:w-auto",
            className,
          )}
        >
          <div
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: current ? PROVIDERS[current.provider].color : "#999" }}
          />
          <span className="truncate flex-1 text-left">{current?.name ?? "Pick a model"}</span>
          {current?.free && (
            current.tags?.includes("frontier-free")
              ? <Badge variant="frontier-free" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">FRONTIER FREE</Badge>
              : <Badge variant="success" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">FREE</Badge>
          )}
          {NEW_IDS.has(current?.id ?? "") && <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-1.5 py-0 border-amber-400 text-amber-500">NEW</Badge>}
          {current && requiresApiKey(current) && (
            <span title="Requires API key (BYOK)" className="hidden sm:flex items-center flex-shrink-0">
              <KeyRound className="h-3 w-3 text-muted-foreground/60" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[500px] max-w-[95vw] p-0">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${MODELS.length} models (${freeCount} free)…`}
              className="pl-9 h-9 bg-muted/50 border-transparent focus:border-input"
              autoFocus
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                activeFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground self-center pr-1">
            {filtered.length} shown
          </span>
        </div>

        {/* Model list grouped by provider */}
        <div className="max-h-[460px] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No models match.</div>
          ) : (
            grouped.map(({ provider, models }) => (
              <div key={provider}>
                {/* Provider header */}
                <div
                  className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-sm border-b border-t first:border-t-0"
                >
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PROVIDERS[provider].color }} />
                  {PROVIDERS[provider].name}
                  <span className="ml-auto font-normal">{models.length} models</span>
                </div>
                {models.map(m => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    selected={m.id === value}
                    isNew={NEW_IDS.has(m.id)}
                    onClick={() => { onChange(m.id); setOpen(false); }}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModelRow({ model, selected, isNew, onClick }: {
  model: ModelSpec;
  selected: boolean;
  isNew: boolean;
  onClick: () => void;
}) {
  const provider = PROVIDERS[model.provider];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-start gap-3 group",
        selected && "bg-accent/80",
      )}
    >
      <div
        className="h-8 w-8 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
        style={{ backgroundColor: provider.color }}
      >
        {provider.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm truncate">{model.name}</span>
          {selected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          {isNew && <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 text-amber-500 flex-shrink-0">NEW</Badge>}
          {model.free && (
            model.tags?.includes("frontier-free")
              ? <Badge variant="frontier-free" className="text-[9px] px-1 py-0 flex-shrink-0">FRONTIER</Badge>
              : <Badge variant="success" className="text-[9px] px-1 py-0 flex-shrink-0">FREE</Badge>
          )}
          {requiresApiKey(model) && (
            <span title="Requires your own API key — add in Settings → BYOK" className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded px-1 py-0 flex-shrink-0">
              <KeyRound className="h-2 w-2" />KEY
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {model.vendor} · {model.context >= 1_000_000 ? `${(model.context/1_000_000).toFixed(1)}M` : `${Math.round(model.context/1000)}K`} ctx
          {model.modalities.includes("vision") && " · 👁 vision"}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" /> {model.speedScore ?? "—"}</span>
          <span className="flex items-center gap-0.5"><BarChart3 className="h-2.5 w-2.5" /> {model.benchmark ?? "—"}</span>
          {model.tags.slice(0, 2).map(t => (
            <span key={t} className="bg-muted/60 px-1 rounded text-[10px]">{t}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
