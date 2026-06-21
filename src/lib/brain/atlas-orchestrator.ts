"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — sub-agent orchestrator
//
// Fans a complex task out to N read-only sub-agents, each running its own
// headless `runAgentLoop` with the restricted SUBAGENT_TOOLS pack. Sub-agents
// run in a bounded-concurrency pool (default 3 in flight) and report progress
// through `onUpdate`, so the bar can render live nested status. Results are
// collected and returned to the lead agent for synthesis.
//
// Sub-agents are deliberately read-only (no navigate / no mutations / no further
// delegation) — that keeps parallelism side-effect-free and prevents recursion.
// ─────────────────────────────────────────────────────────────────────────────

import { runAgentLoop } from "@/lib/brain/loop";
import {
  SUBAGENT_TOOLS, buildSubagentPrompt, executeReadonlyTool,
  type SubTask, type SubResult,
} from "@/lib/brain/platform-tools";
import type { ToolResult } from "@/lib/code/tools";

export type { SubTask, SubResult };

/** Weak (keyless) models sometimes fabricate a JSON "result" as their answer.
 *  Prefer the model's prose, but fall back to the REAL last tool result so a
 *  sub-agent summary always reflects true catalog data, never hallucinated JSON. */
function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function briefFromResult(output: unknown): string {
  if (output == null) return "";
  if (typeof output === "string") return output.slice(0, 400);
  if (Array.isArray(output)) {
    const items = output.slice(0, 5).map((o) => {
      if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        const name = r.name ?? r.title ?? r.id ?? r.model;
        const bench = typeof r.benchmark === "number" ? ` (bench ${r.benchmark}${r.free ? ", free" : ""})` : "";
        return name ? `${name}${bench}` : JSON.stringify(o).slice(0, 60);
      }
      return String(o);
    });
    return items.join("; ");
  }
  return JSON.stringify(output).slice(0, 400);
}

function pickSummary(finalText: string, lastResult: ToolResult | null): string {
  if (finalText && !looksLikeJson(finalText)) return finalText;
  if (lastResult?.ok) {
    const brief = briefFromResult(lastResult.output);
    if (brief) return brief;
  }
  return finalText || "(no output)";
}

export interface SubagentUpdate {
  status?: "running" | "done" | "error";
  summary?: string;
  toolCount?: number;
}

export interface RunSubagentsConfig {
  modelId: string;
  apiKey?: string;
  useNativeTools: boolean;
  signal?: AbortSignal;
  /** Max sub-agents in flight at once (default 3). */
  concurrency?: number;
  /** Per-sub-agent live progress callback (index into the subtasks array). */
  onUpdate?: (index: number, patch: SubagentUpdate) => void;
}

/** Run sub-tasks in parallel (bounded pool); resolve with each one's result. */
export async function runSubagents(subtasks: SubTask[], cfg: RunSubagentsConfig): Promise<SubResult[]> {
  const results: SubResult[] = subtasks.map((s) => ({ role: s.role, task: s.task, ok: false, summary: "", toolCount: 0 }));
  const poolSize = Math.max(1, Math.min(cfg.concurrency ?? 3, subtasks.length));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= subtasks.length) return;
      const st = subtasks[i];

      if (cfg.signal?.aborted) {
        results[i] = { ...results[i], ok: false, summary: "(aborted)" };
        cfg.onUpdate?.(i, { status: "error", summary: "(aborted)" });
        continue;
      }

      cfg.onUpdate?.(i, { status: "running" });
      let finalText = "";
      let toolCount = 0;
      let lastResult: ToolResult | null = null;

      try {
        await runAgentLoop({
          modelId: cfg.modelId,
          apiKey: cfg.apiKey,
          systemPrompt: buildSubagentPrompt(st.role, cfg.useNativeTools),
          messages: [{ role: "user", content: st.task }],
          toolDefs: SUBAGENT_TOOLS,
          useNativeTools: cfg.useNativeTools,
          executeTool: executeReadonlyTool,
          signal: cfg.signal,
          maxTurns: 8,
          maxFixAttempts: 3,
          onEvent: (e) => {
            if (e.type === "assistant_done") {
              if (e.text.trim()) finalText = e.text.trim();
            } else if (e.type === "tool_call") {
              toolCount += 1;
              cfg.onUpdate?.(i, { status: "running", toolCount });
            } else if (e.type === "tool_result" && e.result.ok) {
              lastResult = e.result;
            }
          },
        });
        const summary = pickSummary(finalText, lastResult);
        results[i] = { role: st.role, task: st.task, ok: true, summary, toolCount };
        cfg.onUpdate?.(i, { status: "done", summary, toolCount });
      } catch (e) {
        const summary = e instanceof Error ? e.message : "sub-agent failed";
        results[i] = { role: st.role, task: st.task, ok: false, summary, toolCount };
        cfg.onUpdate?.(i, { status: "error", summary, toolCount });
      }
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}
