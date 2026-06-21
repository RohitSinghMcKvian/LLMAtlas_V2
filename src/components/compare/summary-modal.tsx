"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Sparkles, Trophy, RefreshCw, Copy, Download, Scale } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/playground/model-picker";
import { RichMarkdown } from "@/components/compare/rich-markdown";
import { findModel, PROVIDERS } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";
import { copyToClipboard, cn } from "@/lib/utils";
import { parseStreamBuffer } from "@/lib/stream-events";
import type { Round } from "@/lib/compare";

interface Props {
  open: boolean;
  onClose: () => void;
  rounds: Round[];
  columns: string[];
  /** colIndex -> aggregated win count across rounds (passed from page). */
  winCounts: Record<number, number>;
}

const ASPECTS = ["Accuracy", "Depth", "Clarity", "Structure", "Citation use", "Completeness"];

const SUMMARY_SYSTEM = `You are an expert evaluator judging multi-model AI responses. Be precise, concise, and impartial. Use only the information in the conversation provided — do not invent facts.

For the FULL conversation across all turns:
1. Rate each model on a 0–10 scale across these aspects: Accuracy, Depth, Clarity, Structure, Citation use, Completeness. Present this as a Markdown table.
2. Briefly summarize each model's overall strengths and weaknesses (one short paragraph per model).
3. Identify the OVERALL WINNER across the whole conversation, and explicitly justify the choice in 2-3 sentences.
4. If a follow-up turn changed the ranking, mention it.

Format the answer in clean Markdown with these section headers exactly:
## Score Card
## Per-Model Notes
## Overall Winner
## Best Single Response`;

function buildJudgePrompt(rounds: Round[], columns: string[]): string {
  const lines: string[] = [];
  rounds.forEach((r, ri) => {
    lines.push(`# Turn ${ri + 1}`);
    lines.push(`USER PROMPT: ${r.prompt}\n`);
    columns.forEach((mid, c) => {
      const m = findModel(mid);
      const cell = r.responses[c];
      lines.push(`## Model ${c + 1}: ${m?.name ?? mid}`);
      lines.push(cell?.content?.slice(0, 6000) || "_(no response)_");
      lines.push("");
    });
  });
  return lines.join("\n");
}

export function SummaryModal({ open, onClose, rounds, columns, winCounts }: Props) {
  const byok = useSettingsStore((s) => s.keys);
  const [judgeId, setJudgeId] = useState("groq-llama-3.3-70b");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalResponses = useMemo(
    () => rounds.reduce((n, r) => n + Object.values(r.responses).filter((c) => c.content).length, 0),
    [rounds],
  );

  const judge = findModel(judgeId);

  const run = useCallback(async () => {
    if (!judge) return;
    setStreaming(true);
    setOutput("");
    setError(null);

    const judgePrompt = buildJudgePrompt(rounds, columns);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: judgeId,
          apiKey: byok[judge.provider],
          maxTokens: 2048,
          messages: [
            { role: "system", content: SUMMARY_SYSTEM },
            { role: "user", content: judgePrompt },
          ],
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parsed = parseStreamBuffer(buf);
        setOutput(parsed.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summary failed");
    } finally {
      setStreaming(false);
    }
  }, [judge, judgeId, byok, rounds, columns]);

  // Auto-run on open if there are responses and no output yet
  useEffect(() => {
    if (open && totalResponses > 0 && !output && !streaming && !error) {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copy() {
    await copyToClipboard(output);
    toast.success("Summary copied");
  }

  function exportMd() {
    const blob = new Blob(
      [`# Comparison Summary\n\nJudge: ${judge?.name ?? judgeId}\n\n${output}`],
      { type: "text/markdown" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `summary-${Date.now()}.md`;
    a.click();
    toast.success("Exported");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1100px] flex-col gap-0 p-0">
        {/* Header */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 text-white">
            <Scale className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base font-semibold leading-tight">
              AI Comparison Summary
            </DialogTitle>
            <p className="truncate text-xs text-muted-foreground">
              {totalResponses} response{totalResponses !== 1 ? "s" : ""} across {rounds.length} turn{rounds.length !== 1 ? "s" : ""} · {columns.length} models
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={copy} disabled={!output} className="h-8 gap-1.5">
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={exportMd} disabled={!output} className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Judge picker + run controls */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Judge
          </span>
          <div className="min-w-[200px] flex-1 max-w-[360px]">
            <ModelPicker value={judgeId} onChange={setJudgeId} className="w-full" />
          </div>
          <Button onClick={run} disabled={streaming} size="sm" className="ml-auto h-8 gap-1.5">
            {streaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : output ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {streaming ? "Analyzing…" : output ? "Re-run" : "Analyze"}
          </Button>
        </div>

        {/* Vote counts strip */}
        {Object.keys(winCounts).length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap gap-2 border-b bg-card px-4 py-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              Your votes:
            </span>
            {columns.map((mid, c) => {
              const m = findModel(mid);
              const count = winCounts[c] ?? 0;
              if (count === 0) return null;
              return (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                >
                  <Trophy className="h-2.5 w-2.5" />
                  {m?.name ?? mid}: {count}
                </span>
              );
            })}
          </div>
        )}

        {/* Output area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : totalResponses === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Run at least one turn to generate a comparison summary.
              </p>
            </div>
          ) : !output && streaming ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm font-medium">Analyzing all responses…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rating across {ASPECTS.length} aspects, then picking the winner.
              </p>
            </div>
          ) : (
            <RichMarkdown content={output} streaming={streaming} compact={false} />
          )}
        </div>

        {/* Aspect legend (footer) */}
        <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-t bg-muted/20 px-4 py-2 text-[10px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">Aspects analyzed:</span>
          {ASPECTS.map((a) => (
            <span
              key={a}
              className={cn(
                "rounded-full bg-card px-2 py-0.5 ring-1 ring-border/60",
              )}
            >
              {a}
            </span>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
