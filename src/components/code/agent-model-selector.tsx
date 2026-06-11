"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, Zap, BarChart3, Sparkles, Code2, Brain, Star, KeyRound, Wrench } from "lucide-react";
import { MODELS, PROVIDERS, requiresApiKey, supportsTools, type ModelSpec, type ProviderId } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FilterTab = "agent" | "all" | "free" | "code" | "reasoning";

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: "agent",     label: "Agent",     icon: <Wrench className="h-3 w-3" /> },
  { id: "all",       label: "All",       icon: <Sparkles className="h-3 w-3" /> },
  { id: "free",      label: "Free",      icon: <Star className="h-3 w-3" /> },
  { id: "code",      label: "Code",      icon: <Code2 className="h-3 w-3" /> },
  { id: "reasoning", label: "Reason",    icon: <Brain className="h-3 w-3" /> },
];

const PROVIDER_ORDER: ProviderId[] = [
  "groq", "cerebras", "deepseek", "google", "nvidia", "openrouter",
  "github-models", "mistral", "together", "xai", "pollinations", "cloudflare", "huggingface",
];

interface Props {
  className?: string;
}

export function AgentModelSelector({ className }: Props) {
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const setDefaultModel = useSettingsStore((s) => s.setDefaultModel);
  const byok = useSettingsStore((s) => s.keys);
  const current = MODELS.find((m) => m.id === defaultModel);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("agent");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const filtered = useMemo(() => {
    let list = MODELS;

    switch (activeFilter) {
      case "agent":
        list = list.filter((m) => supportsTools(m) || m.tags.some((t) => ["code", "agentic", "reasoning"].includes(t)));
        break;
      case "free":
        list = list.filter((m) => m.free);
        break;
      case "code":
        list = list.filter((m) => m.tags.includes("code") || m.modalities.includes("code"));
        break;
      case "reasoning":
        list = list.filter((m) => m.tags.some((t) => ["reasoning", "thinking", "math"].includes(t)));
        break;
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.vendor.toLowerCase().includes(q) ||
          PROVIDERS[m.provider].name.toLowerCase().includes(q) ||
          m.tags.some((t) => t.includes(q)),
      );
    }

    return list;
  }, [query, activeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<ProviderId, ModelSpec[]>();
    for (const m of filtered) {
      if (!map.has(m.provider)) map.set(m.provider, []);
      map.get(m.provider)!.push(m);
    }
    return PROVIDER_ORDER.filter((p) => map.has(p)).map((p) => ({ provider: p, models: map.get(p)! }));
  }, [filtered]);

  function selectModel(id: string) {
    setDefaultModel(id);
    setOpen(false);
    setQuery("");
  }

  const hasKey = current ? !requiresApiKey(current) || !!byok[current.provider] : false;
  const toolSupport = current ? supportsTools(current) : false;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        data-agent-model-trigger
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 max-w-full px-1.5 py-0.5 rounded-md hover:bg-accent/60 transition-colors text-[11px] text-muted-foreground min-w-0"
      >
        {current && (
          <div
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: PROVIDERS[current.provider].color }}
          />
        )}
        <span className="truncate min-w-0">{current?.name ?? "Select model"}</span>
        {current?.free && (
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">FREE</span>
        )}
        {current && !hasKey && (
          <KeyRound className="h-2.5 w-2.5 text-amber-500 shrink-0" />
        )}
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[340px] max-w-[92vw] rounded-lg border bg-popover shadow-xl">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${MODELS.length} models…`}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted/50 rounded-md border-0 outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 p-1.5 border-b overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors shrink-0",
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground self-center pr-1">
              {filtered.length}
            </span>
          </div>

          {/* Model list */}
          <div className="max-h-[360px] overflow-y-auto">
            {grouped.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No models match.</div>
            ) : (
              grouped.map(({ provider, models }) => (
                <div key={provider}>
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-sm border-b">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: PROVIDERS[provider].color }}
                    />
                    {PROVIDERS[provider].name}
                    <span className="ml-auto font-normal">{models.length}</span>
                  </div>
                  {models.map((m) => (
                    <CompactModelRow
                      key={m.id}
                      model={m}
                      selected={m.id === defaultModel}
                      hasKey={!requiresApiKey(m) || !!byok[m.provider]}
                      onClick={() => selectModel(m.id)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer: current model info */}
          {current && (
            <div className="border-t px-2.5 py-2 text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{current.name}</span>
                {toolSupport && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                    <Wrench className="h-2.5 w-2.5" /> Tools
                  </span>
                )}
                {!toolSupport && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                    <Wrench className="h-2.5 w-2.5" /> Text-only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>{current.context >= 1_000_000 ? `${(current.context / 1_000_000).toFixed(1)}M` : `${Math.round(current.context / 1000)}K`} ctx</span>
                <span className="flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" /> {current.speedScore ?? "—"}</span>
                <span className="flex items-center gap-0.5"><BarChart3 className="h-2.5 w-2.5" /> {current.benchmark ?? "—"}</span>
              </div>
              {!hasKey && (
                <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <KeyRound className="h-2.5 w-2.5" />
                  API key required — add in Settings → BYOK
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompactModelRow({
  model,
  selected,
  hasKey,
  onClick,
}: {
  model: ModelSpec;
  selected: boolean;
  hasKey: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-2.5 py-1.5 hover:bg-accent transition-colors flex items-center gap-2 group min-w-0",
        selected && "bg-accent/80",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-medium truncate min-w-0">{model.name}</span>
          {selected && <Check className="h-3 w-3 text-primary shrink-0" />}
          {model.free && (
            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">FREE</span>
          )}
          {!hasKey && (
            <KeyRound className="h-2.5 w-2.5 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{model.context >= 1_000_000 ? `${(model.context / 1_000_000).toFixed(1)}M` : `${Math.round(model.context / 1000)}K`}</span>
          <span className="flex items-center gap-0.5"><Zap className="h-2 w-2" />{model.speedScore ?? "—"}</span>
          <span className="flex items-center gap-0.5"><BarChart3 className="h-2 w-2" />{model.benchmark ?? "—"}</span>
          {model.tags.slice(0, 2).map((t) => (
            <span key={t} className="bg-muted/60 px-1 rounded text-[9px]">{t}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
