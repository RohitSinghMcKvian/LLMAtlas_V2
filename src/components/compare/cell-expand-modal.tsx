"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichMarkdown } from "@/components/compare/rich-markdown";
import { findModel, PROVIDERS } from "@/lib/models";
import { copyToClipboard, formatLatency, cn } from "@/lib/utils";
import { type CellState, type Source, linkifyCitations } from "@/lib/compare";

interface Props {
  open: boolean;
  onClose: () => void;
  modelId: string;
  state: CellState;
  sources?: Source[];
  prompt: string;
}

/** Fullscreen view of a single model's response with rich rendering. */
export function CellExpandModal({ open, onClose, modelId, state, sources, prompt }: Props) {
  const model = findModel(modelId);
  if (!model) return null;
  const provider = PROVIDERS[model.provider];
  const rendered = state.content && !state.streaming
    ? linkifyCitations(state.content, sources)
    : state.content;

  async function copy() {
    await copyToClipboard(state.content);
    toast.success("Copied");
  }

  function exportMd() {
    const lines = [
      `# ${model?.name ?? modelId} — Response`,
      `\n**Prompt:** ${prompt}\n`,
    ];
    if (sources?.length) {
      lines.push("## Sources");
      sources.forEach((s, i) => lines.push(`${i + 1}. [${s.title}](${s.url})`));
      lines.push("");
    }
    lines.push("## Response", state.content || "_No response_");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(model?.name ?? "response").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.md`;
    a.click();
    toast.success("Exported");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1200px] flex-col gap-0 p-0">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b px-4 py-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: provider.color }}
          >
            {provider.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base font-semibold leading-tight">
              {model.name}
            </DialogTitle>
            <p className="truncate text-xs text-muted-foreground">
              {model.vendor} · {provider.name}
            </p>
          </div>
          <Badge variant={model.free ? "success" : "outline"} className="flex-shrink-0">
            {model.free ? "FREE" : "PAID"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={copy} className="h-8 gap-1.5">
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={exportMd} className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Metrics row */}
        {(state.latencyMs || state.ttftMs) && (
          <div className="flex flex-shrink-0 flex-wrap gap-4 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            {state.ttftMs ? <span>TTFT {formatLatency(state.ttftMs)}</span> : null}
            {state.latencyMs ? <span>Total {formatLatency(state.latencyMs)}</span> : null}
            {state.tokens ? <span>~{state.tokens} tok</span> : null}
            {state.tokensPerSec ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {state.tokensPerSec} tok/s
              </span>
            ) : null}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Prompt context */}
          <div className="mb-4 rounded-xl border bg-muted/40 p-3 text-sm">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Prompt
            </p>
            <p className="whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>
              {prompt}
            </p>
          </div>

          {/* Sources */}
          {sources?.length ? (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Sources
              </p>
              <ol className="space-y-1.5 text-xs">
                {sources.map((s, i) => (
                  <li key={s.url + i} className="flex gap-2">
                    <span className="flex-shrink-0 font-bold text-sky-600 dark:text-sky-400">
                      [{i + 1}]
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "min-w-0 flex-1 text-sky-600 hover:underline dark:text-sky-400",
                        "break-all",
                      )}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Response */}
          {rendered ? (
            <RichMarkdown content={rendered} streaming={state.streaming} compact={false} />
          ) : (
            <p className="italic text-muted-foreground">No response yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
