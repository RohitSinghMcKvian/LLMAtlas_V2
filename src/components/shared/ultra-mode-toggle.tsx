"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Mode Toggle — shared by Playground, Compare, and Learn
//
// A compact, two-part control:
//   • a mode pill (Standard / Plus / Ultra Think / Hermes Agent)
//   • a capability picker (Presentation / Document / App / Game / …)
//
// Surface decides which modes & capabilities to show via `allowedModes` and the
// caller persists state. The component is pure UI — no fetch, no global store.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import {
  CAPABILITIES, ULTRA_MODES,
  type CapabilityId, type UltraMode,
} from "@/lib/ucl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  mode: UltraMode;
  capabilities: CapabilityId[];
  onModeChange: (m: UltraMode) => void;
  onCapabilitiesChange: (c: CapabilityId[]) => void;
  allowedModes?: UltraMode[];
  /** When true, show full labels (desktop). When false, icon-only. */
  expanded?: boolean;
  className?: string;
}

const ALL_MODES: UltraMode[] = ["standard", "plus", "ultra", "hermes"];

export function UltraModeToggle({
  mode,
  capabilities,
  onModeChange,
  onCapabilitiesChange,
  allowedModes = ALL_MODES,
  expanded = true,
  className,
}: Props) {
  const [modeOpen, setModeOpen] = useState(false);
  const [capOpen, setCapOpen] = useState(false);

  const modeInfo = ULTRA_MODES[mode];
  const capCount = capabilities.length;

  const toggleCap = (id: CapabilityId) => {
    if (capabilities.includes(id)) onCapabilitiesChange(capabilities.filter((c) => c !== id));
    else onCapabilitiesChange([...capabilities, id]);
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Mode pill */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setModeOpen((v) => !v); setCapOpen(false); }}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-medium transition-colors",
            mode === "standard"
              ? "bg-muted/40 text-muted-foreground hover:bg-accent"
              : "bg-gradient-to-br from-violet-500/15 to-sky-500/10 border-violet-400/30 text-violet-700 dark:text-violet-300 hover:from-violet-500/25 hover:to-sky-500/20",
          )}
          title={`Mode: ${modeInfo.label} — ${modeInfo.blurb}`}
        >
          <span className="text-sm leading-none">{modeInfo.emoji}</span>
          {expanded && <span className="hidden md:inline">{modeInfo.label}</span>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {modeOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setModeOpen(false)} />
            <div className="fixed inset-x-3 top-[60px] z-40 bg-popover border rounded-xl shadow-xl p-1 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1.5 sm:w-[20rem]">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Ultra-Think Mode
              </p>
              {allowedModes.map((m) => {
                const info = ULTRA_MODES[m];
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { onModeChange(m); setModeOpen(false); }}
                    className={cn(
                      "w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors",
                      mode === m && "bg-accent",
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-tight flex items-center gap-1.5">
                        {info.label}
                        {info.callBudget > 1 && (
                          <Badge variant="secondary" className="text-[9px] py-0 h-3.5">
                            {info.callBudget}× cost
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{info.blurb}</div>
                    </div>
                    {mode === m && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Capability picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setCapOpen((v) => !v); setModeOpen(false); }}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-xs font-medium transition-colors",
            capCount > 0
              ? "bg-gradient-to-br from-amber-500/15 to-pink-500/10 border-amber-400/30 text-amber-700 dark:text-amber-300 hover:from-amber-500/25 hover:to-pink-500/20"
              : "bg-muted/40 text-muted-foreground hover:bg-accent",
          )}
          title={capCount > 0 ? `${capCount} creator capabilities active` : "Add a creator capability"}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {expanded && (
            <span className="hidden md:inline">
              {capCount === 0 ? "Capabilities" : capCount === 1 ? CAPABILITIES.find((c) => c.id === capabilities[0])?.label ?? "1 active" : `${capCount} active`}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {capOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setCapOpen(false)} />
            <div className="fixed inset-x-3 top-[60px] z-40 bg-popover border rounded-xl shadow-xl p-1 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1.5 sm:w-[22rem]">
              <div className="flex items-center justify-between px-3 py-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Creator Capabilities
                </p>
                {capCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onCapabilitiesChange([])}
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                  >
                    <X className="h-2.5 w-2.5" /> clear
                  </button>
                )}
              </div>
              {CAPABILITIES.map((c) => {
                const active = capabilities.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCap(c.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors",
                      active && "bg-accent",
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-tight">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{c.blurb}</div>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
              <div className="mt-1 px-3 py-2 border-t text-[10px] text-muted-foreground leading-snug">
                Each capability primes the model to deliver pro-grade output in that format. Multi-select to combine.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
