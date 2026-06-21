"use client";

import { memo } from "react";
import { Sparkles, Zap, Clock, Trophy, Copy, RefreshCw, KeyRound, Maximize2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreamError, FallbackBanner } from "@/components/shared/stream-error";
import { RichMarkdown } from "@/components/compare/rich-markdown";
import { findModel, PROVIDERS, requiresApiKey } from "@/lib/models";
import { formatLatency, cn, copyToClipboard } from "@/lib/utils";
import { type CellState, type Source, linkifyCitations } from "@/lib/compare";

interface Props {
  modelId: string;
  state: CellState;
  sources?: Source[];
  isWinner: boolean;
  canVote: boolean;
  winCount: number;
  onVote: () => void;
  onRegenerate: () => void;
  onExpand: () => void;
}

function AnswerCellImpl({ modelId, state, sources, isWinner, canVote, winCount, onVote, onRegenerate, onExpand }: Props) {
  const model = findModel(modelId);
  if (!model) return null;
  const provider = PROVIDERS[model.provider];

  async function copyContent() {
    await copyToClipboard(state.content);
    toast.success("Copied");
  }

  const rendered = state.content && !state.streaming
    ? linkifyCitations(state.content, sources)
    : state.content;

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-all",
        isWinner && "ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/10",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5 min-w-0">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
          style={{ backgroundColor: provider.color }}
        >
          {provider.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{model.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{provider.name}</p>
        </div>
        {winCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <Trophy className="h-2.5 w-2.5" />
            {winCount}
          </span>
        )}
        <Badge variant={model.free ? "success" : "outline"} className="flex-shrink-0 text-[9px]">
          {model.free ? "FREE" : "PAID"}
        </Badge>
        {requiresApiKey(model) && (
          <span
            title="Requires your own API key — add in Settings → BYOK"
            className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-600 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-400"
          >
            <KeyRound className="h-2.5 w-2.5" />KEY
          </span>
        )}
      </div>

      {/* Metrics */}
      {(state.latencyMs || state.ttftMs) && (
        <div className="flex flex-wrap gap-3 border-b bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          {state.ttftMs ? (
            <span className="flex items-center gap-0.5">
              <Zap className="h-3 w-3 text-amber-500" /> TTFT {formatLatency(state.ttftMs)}
            </span>
          ) : null}
          {state.latencyMs ? (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {formatLatency(state.latencyMs)}
            </span>
          ) : null}
          {state.tokens ? <span>~{state.tokens} tok</span> : null}
          {state.tokensPerSec ? (
            <span className="font-medium text-emerald-500">{state.tokensPerSec} tok/s</span>
          ) : null}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-3 overflow-hidden p-3.5 min-h-[120px] max-h-[640px] overflow-y-auto">
        {state.fallback && <FallbackBanner event={state.fallback} />}
        {rendered ? (
          <>
            <RichMarkdown content={rendered} streaming={state.streaming} compact />
            {state.streaming && (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
            )}
          </>
        ) : null}
        {state.errorEvent && !state.streaming && (
          <StreamError event={state.errorEvent} onRetry={onRegenerate} />
        )}
        {!rendered && !state.errorEvent && (
          state.streaming ? (
            <div className="flex h-full items-center gap-2 text-sm italic text-muted-foreground">
              <Sparkles className="h-4 w-4" /> Thinking…
            </div>
          ) : (
            <div className="flex h-full flex-col items-start justify-center gap-2">
              <span className="text-sm italic text-muted-foreground">No response yet for this turn.</span>
              <Button size="sm" variant="outline" onClick={onRegenerate} className="h-7 gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>
          )
        )}
      </div>

      {/* Footer actions */}
      {state.content && !state.streaming && (
        <div className="flex flex-wrap items-center justify-end gap-1 border-t p-2">
          <Button size="sm" variant="ghost" onClick={onExpand} className="h-7 gap-1 px-2 text-xs" title="Open fullscreen">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Expand</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={onRegenerate} className="h-7 gap-1 px-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Retry</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={copyContent} className="h-7 gap-1 px-2 text-xs">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Copy</span>
          </Button>
          {canVote && (
            <Button
              size="sm"
              variant={isWinner ? "default" : "outline"}
              onClick={onVote}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{isWinner ? "Winner" : "Best"}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export const AnswerCell = memo(AnswerCellImpl, (a, b) =>
  a.modelId === b.modelId &&
  a.isWinner === b.isWinner &&
  a.canVote === b.canVote &&
  a.winCount === b.winCount &&
  a.sources === b.sources &&
  a.onExpand === b.onExpand &&
  a.state.content === b.state.content &&
  a.state.streaming === b.state.streaming &&
  a.state.latencyMs === b.state.latencyMs &&
  a.state.ttftMs === b.state.ttftMs &&
  a.state.errorEvent === b.state.errorEvent &&
  a.state.fallback === b.state.fallback,
);
