"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles, Zap, Clock, Send, Trophy, BarChart3,
  Plus, X, Copy, Download, KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelPicker } from "@/components/playground/model-picker";
import { StreamError, FallbackBanner } from "@/components/shared/stream-error";
import { findModel, PROVIDERS, MODELS, requiresApiKey } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";
import { formatLatency, estimateTokens, cn, copyToClipboard } from "@/lib/utils";
import { parseStreamBuffer, type StreamEvent } from "@/lib/stream-events";

interface RunState {
  content: string;
  streaming: boolean;
  latencyMs?: number;
  ttftMs?: number;
  tokens?: number;
  tokensPerSec?: number;
  error?: string;
  errorEvent?: StreamEvent;
  fallback?: StreamEvent;
}

const EMPTY: RunState = { content: "", streaming: false };

const SAMPLE_PROMPTS = [
  "Explain why the sky is blue, in plain English, in under 80 words.",
  "Write a recursive binary search in Python with type hints.",
  "What are the key differences between RAG and fine-tuning? When would you use each?",
  "Explain transformers architecture like I'm a software engineer, not an ML researcher.",
  "Write a haiku about artificial intelligence.",
];

export default function ComparePage() {
  const byok = useSettingsStore((s) => s.keys);

  const [modelIds, setModelIds] = useState(["groq-llama-3.3-70b", "or-deepseek-v3-free", "google-gemini-2.5-flash"]);
  const [results, setResults] = useState<RunState[]>([EMPTY, EMPTY, EMPTY]);
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [votes, setVotes] = useState<Record<number, boolean>>({});
  const [thirdVisible, setThirdVisible] = useState(true);

  const busy = results.some(r => r.streaming);
  const activeCount = thirdVisible ? 3 : 2;
  const activeIds = modelIds.slice(0, activeCount);

  async function run() {
    if (!prompt.trim() || busy) return;
    const newResults: RunState[] = Array(activeCount).fill({ ...EMPTY, streaming: true });
    setResults(newResults);
    setVotes({});
    await Promise.all(activeIds.map((id, i) => runOne(id, i)));
  }

  async function runOne(id: string, idx: number) {
    const model = findModel(id);
    if (!model) return;
    const start = Date.now();
    let firstChunk = 0;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: id,
          messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
          apiKey: byok[model.provider],
          maxTokens: 1024,
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let cleanText = "";
      let errorEv: StreamEvent | undefined;
      let fallbackEv: StreamEvent | undefined;
      let frame = 0;
      const flush = () => {
        frame = 0;
        setResults(prev => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], content: cleanText, ttftMs: firstChunk, errorEvent: errorEv, fallback: fallbackEv };
          return copy;
        });
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parsed = parseStreamBuffer(buf);
        const prevLen = cleanText.length;
        cleanText = parsed.text;
        for (const ev of parsed.events) {
          if (ev.kind === "error") errorEv = ev;
          else if (ev.kind === "fallback") fallbackEv = ev;
        }
        if (!firstChunk && cleanText.length > prevLen) firstChunk = Date.now() - start;
        if (!frame) frame = requestAnimationFrame(flush);
      }
      if (frame) cancelAnimationFrame(frame);
      flush();
      const elapsed = Date.now() - start;
      const toks = estimateTokens(cleanText);
      setResults(prev => {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          streaming: false,
          latencyMs: elapsed,
          tokens: toks,
          tokensPerSec: toks > 0 ? Math.round(toks / (elapsed / 1000)) : undefined,
          errorEvent: errorEv,
          fallback: fallbackEv,
        };
        return copy;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "request failed";
      const ev: StreamEvent = { kind: "error", code: "stream_aborted", message: msg };
      setResults(prev => { const copy = [...prev]; copy[idx] = { ...EMPTY, error: msg, errorEvent: ev }; return copy; });
    }
  }

  async function exportComparison() {
    const lines = [`# Model Comparison\n`, `**Prompt:** ${prompt}\n`];
    activeIds.forEach((id, i) => {
      const m = findModel(id);
      const r = results[i];
      lines.push(`## ${m?.name ?? id}`);
      if (r.latencyMs) lines.push(`*TTFT: ${r.ttftMs ? formatLatency(r.ttftMs) : "—"} · Total: ${formatLatency(r.latencyMs)} · ~${r.tokens} tok · ${r.tokensPerSec} tok/s*`);
      lines.push(r.content || "_No response_");
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `compare-${Date.now()}.md`;
    a.click();
    toast.success("Comparison exported as Markdown");
  }

  const hasResults = results.some(r => r.content);

  return (
    <div className="container max-w-[1400px] py-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Comparison Lab</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Compare models side by side.</h1>
        <p className="mt-2 text-muted-foreground">
          Run the same prompt on 2–3 models in parallel. Judge speed, quality, and token efficiency.
        </p>
      </div>

      {/* Prompt Panel */}
      <Card className="mb-5 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Prompt</CardTitle>
            <div className="flex items-center gap-2">
              {hasResults && !busy && (
                <Button variant="ghost" size="sm" onClick={exportComparison} className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              )}
              <select
                onChange={e => setPrompt(e.target.value)}
                value=""
                className="text-xs border rounded-md px-2 py-1.5 bg-card text-muted-foreground"
              >
                <option value="" disabled>Sample prompts…</option>
                {SAMPLE_PROMPTS.map(p => <option key={p} value={p}>{p.slice(0, 60)}…</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your prompt — runs on all models simultaneously."
            className="min-h-[90px]"
          />
          {/* Model selectors */}
          <div className={cn("grid gap-3", thirdVisible ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
            {[0, 1, ...(thirdVisible ? [2] : [])].map(i => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground w-5 flex-shrink-0">#{i+1}</span>
                <ModelPicker
                  value={modelIds[i]}
                  onChange={id => { const copy = [...modelIds]; copy[i] = id; setModelIds(copy); }}
                  className="flex-1"
                />
              </div>
            ))}
            {!thirdVisible && (
              <button
                onClick={() => setThirdVisible(true)}
                className="flex items-center gap-2 justify-center border border-dashed rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" /> Add 3rd model
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={run} disabled={busy || !prompt.trim()} size="lg" className="gap-2">
              <Send className="h-4 w-4" />
              {busy ? "Running…" : `Run ${activeCount} models`}
            </Button>
            {thirdVisible && (
              <Button variant="ghost" size="sm" onClick={() => setThirdVisible(false)} className="gap-1 text-xs">
                <X className="h-3.5 w-3.5" /> Remove 3rd
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className={cn("grid gap-4", thirdVisible ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {[0, 1, ...(thirdVisible ? [2] : [])].map(i => (
          <ResultPanel
            key={i}
            idx={i}
            modelId={modelIds[i]}
            state={results[i] ?? EMPTY}
            isWinner={!!votes[i]}
            allDone={!busy && hasResults}
            onVote={() => setVotes(prev => ({ ...prev, [i]: !prev[i] }))}
            onRetry={() => runOne(modelIds[i], i)}
          />
        ))}
      </div>

      {/* Summary row when done */}
      {!busy && hasResults && (
        <div className="mt-6">
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                <h3 className="font-semibold text-sm">Comparison Summary</h3>
              </div>
              <div className={cn("grid gap-3 text-sm", thirdVisible ? "grid-cols-3" : "grid-cols-2")}>
                {[0, 1, ...(thirdVisible ? [2] : [])].map(i => {
                  const r = results[i];
                  const m = findModel(modelIds[i]);
                  if (!m || !r.latencyMs) return <div key={i} className="text-muted-foreground text-xs">—</div>;
                  return (
                    <div key={i} className="space-y-1">
                      <p className="font-medium truncate">{m.name}</p>
                      <p className="text-muted-foreground text-xs">TTFT: {r.ttftMs ? formatLatency(r.ttftMs) : "—"}</p>
                      <p className="text-muted-foreground text-xs">Total: {formatLatency(r.latencyMs)}</p>
                      <p className="text-muted-foreground text-xs">~{r.tokens} tok · {r.tokensPerSec} tok/s</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Click "Pick winner" on a response to vote. Fastest TTFT = best UX for streaming apps.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ResultPanelImpl({ idx, modelId, state, isWinner, allDone, onVote, onRetry }: {
  idx: number; modelId: string; state: RunState;
  isWinner: boolean; allDone: boolean; onVote: () => void; onRetry: () => void;
}) {
  const model = findModel(modelId);
  if (!model) return null;
  const provider = PROVIDERS[model.provider];

  async function copyContent() {
    await copyToClipboard(state.content);
    toast.success("Copied");
  }

  return (
    <div>
      <Card className={cn(
        "h-full transition-all flex flex-col",
        isWinner && "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10",
      )}>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: provider.color }}>
              {provider.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{model.name}</p>
              <p className="text-xs text-muted-foreground">{model.vendor} · {provider.name}</p>
            </div>
            <Badge variant={model.free ? "success" : "outline"} className="text-[10px] flex-shrink-0">
              {model.free ? "FREE" : "PAID"}
            </Badge>
            {requiresApiKey(model) && (
              <span title="Requires your own API key — add in Settings → BYOK" className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded px-1.5 py-0.5 flex-shrink-0">
                <KeyRound className="h-2.5 w-2.5" />KEY
              </span>
            )}
          </div>
          {(state.latencyMs || state.ttftMs) && (
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
              {state.ttftMs && <span className="flex items-center gap-0.5"><Zap className="h-3 w-3 text-amber-500" /> TTFT {formatLatency(state.ttftMs)}</span>}
              {state.latencyMs && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatLatency(state.latencyMs)}</span>}
              {state.tokens && <span>~{state.tokens} tok</span>}
              {state.tokensPerSec && <span className="text-emerald-500 font-medium">{state.tokensPerSec} tok/s</span>}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 flex-1 min-h-[180px] space-y-3">
          {state.fallback && <FallbackBanner event={state.fallback} />}
          {state.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:text-xs">
              {state.streaming ? (
                <pre className="whitespace-pre-wrap font-sans m-0 p-0 text-sm leading-relaxed bg-transparent border-0">{state.content}</pre>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
              )}
              {state.streaming && <span className="inline-block h-3 w-1.5 bg-primary animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
          {state.errorEvent && !state.streaming && (
            <StreamError event={state.errorEvent} onRetry={onRetry} />
          )}
          {!state.content && !state.errorEvent && (
            <div className="text-sm text-muted-foreground italic flex items-center gap-2 h-full">
              <Sparkles className="h-4 w-4" /> {state.streaming ? "Streaming…" : "Awaiting response…"}
            </div>
          )}
        </CardContent>

        {state.content && !state.streaming && (
          <div className="border-t p-3 flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={copyContent} className="gap-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            {allDone && (
              <Button size="sm" variant={isWinner ? "default" : "outline"} onClick={onVote} className="gap-1.5 text-xs">
                <Trophy className="h-3.5 w-3.5" />
                {isWinner ? "✓ Winner" : "Pick winner"}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

const ResultPanel = memo(ResultPanelImpl, (a, b) =>
  a.idx === b.idx &&
  a.modelId === b.modelId &&
  a.isWinner === b.isWinner &&
  a.allDone === b.allDone &&
  a.state.content === b.state.content &&
  a.state.streaming === b.state.streaming &&
  a.state.latencyMs === b.state.latencyMs &&
  a.state.ttftMs === b.state.ttftMs &&
  a.state.errorEvent === b.state.errorEvent &&
  a.state.fallback === b.state.fallback,
);
