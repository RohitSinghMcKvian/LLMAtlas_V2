"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  streamingEnabled?: boolean;
  onChange: (next: Partial<{
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    streamingEnabled: boolean;
  }>) => void;
}

const DEFAULTS = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

function ParamRow({
  label,
  value,
  hint,
  children,
  badge,
}: {
  label: string;
  value: string | number;
  hint?: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {badge && <Badge variant="secondary" className="text-[10px] py-0 h-4">{badge}</Badge>}
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

export function PlaygroundSettings({
  systemPrompt,
  temperature,
  maxTokens,
  topP,
  frequencyPenalty = 0,
  presencePenalty = 0,
  streamingEnabled = true,
  onChange,
}: Props) {
  const isDefaultTemp = temperature === DEFAULTS.temperature;
  const isDefaultTokens = maxTokens === DEFAULTS.maxTokens;

  const resetAll = () => onChange({ ...DEFAULTS, streamingEnabled: true });

  return (
    <div className="space-y-7 pb-6">
      {/* Reset button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Adjust generation parameters for this session.</p>
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* System prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="system" className="text-sm font-medium">System prompt</Label>
          <span className="text-[10px] text-muted-foreground">{systemPrompt.length} chars</span>
        </div>
        <Textarea
          id="system"
          value={systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant…"
          className="min-h-[120px] text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Defines the assistant's persona, style, and constraints.
        </p>
      </div>

      <hr className="border-border/50" />

      {/* Temperature */}
      <ParamRow
        label="Temperature"
        value={temperature.toFixed(2)}
        hint="Controls randomness. 0 = focused & deterministic. 1–2 = creative & varied."
        badge={temperature === 0 ? "Greedy" : temperature < 0.5 ? "Precise" : temperature > 1.2 ? "Wild" : undefined}
      >
        <div className="relative">
          <Slider
            min={0} max={2} step={0.05}
            value={[temperature]}
            onValueChange={([v]) => onChange({ temperature: v })}
            className={cn(!isDefaultTemp && "accent-primary")}
          />
          {/* Guideposts */}
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1 px-0.5">
            <span>Precise</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>
      </ParamRow>

      {/* Max tokens */}
      <ParamRow
        label="Max output tokens"
        value={maxTokens >= 1000 ? `${(maxTokens / 1000).toFixed(1)}K` : maxTokens}
        hint="Maximum tokens in the response. Higher = longer answers but slower."
      >
        <Slider
          min={64} max={8192} step={64}
          value={[maxTokens]}
          onValueChange={([v]) => onChange({ maxTokens: v })}
        />
      </ParamRow>

      {/* Top-p */}
      <ParamRow
        label="Top-p (nucleus)"
        value={topP.toFixed(2)}
        hint="Sample from the top p% of probability mass. Lower = more conservative. Usually leave at 1."
      >
        <Slider
          min={0} max={1} step={0.05}
          value={[topP]}
          onValueChange={([v]) => onChange({ topP: v })}
        />
      </ParamRow>

      <hr className="border-border/50" />

      {/* Frequency penalty */}
      <ParamRow
        label="Frequency penalty"
        value={frequencyPenalty.toFixed(2)}
        hint="Reduces repetition of frequent tokens. Higher = less repetition."
        badge={frequencyPenalty > 0 ? "Active" : undefined}
      >
        <Slider
          min={0} max={2} step={0.05}
          value={[frequencyPenalty]}
          onValueChange={([v]) => onChange({ frequencyPenalty: v })}
        />
      </ParamRow>

      {/* Presence penalty */}
      <ParamRow
        label="Presence penalty"
        value={presencePenalty.toFixed(2)}
        hint="Encourages exploring new topics. Higher = more diverse vocabulary."
        badge={presencePenalty > 0 ? "Active" : undefined}
      >
        <Slider
          min={0} max={2} step={0.05}
          value={[presencePenalty]}
          onValueChange={([v]) => onChange({ presencePenalty: v })}
        />
      </ParamRow>

      <hr className="border-border/50" />

      {/* Streaming toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Streaming</Label>
          <p className="text-xs text-muted-foreground">Show tokens as they arrive (recommended).</p>
        </div>
        <Switch
          checked={streamingEnabled}
          onCheckedChange={(v) => onChange({ streamingEnabled: v })}
        />
      </div>

      {/* Info callout */}
      <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
        <span>
          Not all providers support every parameter. Unsupported fields are silently ignored.
        </span>
      </div>
    </div>
  );
}
