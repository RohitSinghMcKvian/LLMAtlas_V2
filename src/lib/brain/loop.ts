"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — headless agent loop
//
// A surface-agnostic version of the /code agent loop. It owns the think→tool→
// observe cycle but delegates *everything* environmental through config:
//   • executeTool — the caller decides what tools do (real WebContainer FS, or
//     an isolated in-memory sandbox for the Comparison Arena, or platform tools)
//   • onEvent     — the caller renders streamed text, tool calls, plans, usage
//
// This is what makes multi-agent orchestration possible: spin up N independent
// loops, each with its own sandbox + model, and watch them race. No React, no
// approval UI, no workspace store — those belong to the surface.
// ─────────────────────────────────────────────────────────────────────────────

import { findModel } from "@/lib/models";
import { parseStreamBuffer } from "@/lib/stream-events";
import { agentToolsAsNative } from "@/lib/brain/prompt";
import { findToolBlock, parseToolCall, stripToolBlocks, stringifyResult, commandFailed } from "@/lib/brain/parse";
import type { ToolDefinition, ToolCall, ToolResult } from "@/lib/code/tools";

/** A message in the headless loop's working transcript. */
export type LoopMessage =
  | { role: "user" | "assistant"; content: string }
  | { role: "tool"; toolName: string; toolArgs: Record<string, unknown>; result: ToolResult };

export type AgentEvent =
  | { type: "turn_start"; turn: number }
  | { type: "text"; text: string }                 // cumulative assistant text this turn
  | { type: "assistant_done"; text: string }        // final assistant text (tool blocks stripped)
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; call: ToolCall; result: ToolResult }
  | { type: "usage"; promptTokens: number; completionTokens: number; costUSD: number }
  | { type: "done"; reason: "complete" | "max_turns" | "max_fix" | "aborted" }
  | { type: "error"; message: string };

export interface AgentLoopConfig {
  modelId: string;
  apiKey?: string;
  systemPrompt: string;
  /** Working transcript seed — usually a single user message (the task). */
  messages: LoopMessage[];
  toolDefs: ToolDefinition[];
  useNativeTools: boolean;
  executeTool: (call: ToolCall) => Promise<ToolResult>;
  onEvent: (e: AgentEvent) => void;
  signal?: AbortSignal;
  maxTurns?: number;
  maxFixAttempts?: number;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULTS = { maxTurns: 24, maxFixAttempts: 5, maxTokens: 4096, temperature: 0.2 };

function toApiMessages(systemPrompt: string, convo: LoopMessage[]) {
  return [
    { role: "system" as const, content: systemPrompt },
    ...convo.map((m) =>
      m.role === "tool"
        ? {
            role: "user" as const,
            content: `Tool result for ${m.toolName}(${JSON.stringify(m.toolArgs)}):\n${stringifyResult(m.result)}`,
          }
        : { role: m.role, content: m.content },
    ),
  ];
}

export async function runAgentLoop(cfg: AgentLoopConfig): Promise<void> {
  const opts = { ...DEFAULTS, ...cfg };
  const model = findModel(cfg.modelId);
  const convo: LoopMessage[] = [...cfg.messages];
  const nativeTools = cfg.useNativeTools ? agentToolsAsNative(cfg.toolDefs) : undefined;
  let fixAttempts = 0;

  try {
    for (let turn = 0; turn < opts.maxTurns; turn++) {
      if (cfg.signal?.aborted) { cfg.onEvent({ type: "done", reason: "aborted" }); return; }
      cfg.onEvent({ type: "turn_start", turn });

      const apiMessages = toApiMessages(cfg.systemPrompt, convo);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: cfg.signal,
        body: JSON.stringify({
          modelId: cfg.modelId,
          messages: apiMessages,
          temperature: opts.temperature,
          maxTokens: opts.maxTokens,
          apiKey: cfg.apiKey,
          ...(nativeTools ? { tools: nativeTools } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "request failed"));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        cfg.onEvent({ type: "text", text: parseStreamBuffer(raw).text });
      }

      const { text: finalText, events } = parseStreamBuffer(raw);

      // Usage / cost accounting.
      const usage = events.find((e) => e.kind === "usage");
      const tin = usage?.promptTokens ?? Math.ceil(JSON.stringify(apiMessages).length / 4);
      const tout = usage?.completionTokens ?? Math.ceil(finalText.length / 4);
      const cost = usage?.costUSD ?? (model ? (tin / 1e6) * model.inputPrice + (tout / 1e6) * model.outputPrice : 0);
      cfg.onEvent({ type: "usage", promptTokens: tin, completionTokens: tout, costUSD: cost });

      const toolMatch = findToolBlock(finalText);
      if (!toolMatch) {
        cfg.onEvent({ type: "assistant_done", text: finalText.trim() });
        convo.push({ role: "assistant", content: finalText.trim() });
        cfg.onEvent({ type: "done", reason: "complete" });
        return;
      }

      const displayText = stripToolBlocks(finalText);
      cfg.onEvent({ type: "assistant_done", text: displayText });
      convo.push({ role: "assistant", content: displayText });

      const call = parseToolCall(toolMatch.json);
      if (!call) { cfg.onEvent({ type: "error", message: "couldn't parse tool call" }); continue; }

      cfg.onEvent({ type: "tool_call", call });
      const result = await cfg.executeTool(call);
      cfg.onEvent({ type: "tool_result", call, result });
      convo.push({ role: "tool", toolName: call.name, toolArgs: call.args, result });

      if (commandFailed(call, result) || !result.ok) fixAttempts += 1;
      else if (call.name === "run_bash" || call.name === "run_tests") fixAttempts = 0;

      if (fixAttempts >= opts.maxFixAttempts) { cfg.onEvent({ type: "done", reason: "max_fix" }); return; }
    }
    cfg.onEvent({ type: "done", reason: "max_turns" });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") { cfg.onEvent({ type: "done", reason: "aborted" }); return; }
    cfg.onEvent({ type: "error", message: e instanceof Error ? e.message : "agent loop failed" });
    cfg.onEvent({ type: "done", reason: "complete" });
  }
}

export type { ToolDefinition, ToolCall, ToolResult };
