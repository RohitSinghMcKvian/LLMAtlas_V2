// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Capability Layer — Ultra-Think runner
//
// A client-side multi-call orchestrator that turns ANY chat model into an
// "ultra-think" reasoner via the same plan→build→reflect→polish pattern used in
// systems like Claude-Code's ultra-think and Hermes' chain-of-thought:
//
//   Phase 1 (plan)    — short, focused: "spell out the goal, plan the artifact"
//   Phase 2 (build)   — produce the FINAL deliverable per the plan
//   Phase 3 (critique)— optional self-critique → revised version
//
// It streams each phase through the existing /api/chat endpoint so we inherit
// the streaming, error handling, BYOK, model fallback, and artifact detection
// the surfaces already use.
//
// The output is a SINGLE assistant message (the build, possibly revised) that
// the calling surface streams into its UI exactly like a normal answer. The
// intermediate phases are reported via `onPhase` so surfaces can show progress.
// ─────────────────────────────────────────────────────────────────────────────

import { parseStreamBuffer, type StreamEvent } from "@/lib/stream-events";
import { findModel } from "@/lib/models";
import { ULTRA_MODES, type UltraMode } from "./modes";

export type UltraPhase = "plan" | "build" | "critique" | "polish";

export interface UltraThinkArgs {
  modelId: string;
  apiKey?: string;
  systemPrompt: string;
  /** The conversation history INCLUDING the user message to answer. */
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  mode: UltraMode;
  /** Called with cumulative text for each phase. UI shows phase progress. */
  onPhase?: (phase: UltraPhase, text: string, status: "running" | "done") => void;
  /** Called with cumulative text of the FINAL deliverable. UI streams this. */
  onDelta?: (text: string) => void;
  /** Called for usage events from the API. */
  onUsage?: (ev: StreamEvent) => void;
  signal?: AbortSignal;
  /** Override max tokens (default: from model spec). */
  maxTokens?: number;
}

export interface UltraThinkResult {
  /** Final visible answer. */
  text: string;
  /** The plan the model produced (for replay/debug). */
  plan?: string;
  /** Critique notes the model produced (only when mode runs phase 3). */
  critique?: string;
  /** Sum of usage across all phases. */
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  errorEvent?: StreamEvent;
  fallbackEvent?: StreamEvent;
}

const PLAN_INSTRUCTIONS = `
You are in PLAN phase. Do NOT write the final answer yet.
Write a tight internal plan covering:
  • The user's actual goal (one sentence)
  • The single best deliverable format (artifact kind + title) — or "prose only" if no artifact fits
  • A 3-6 bullet outline of what the final answer will contain
  • The biggest quality risk and how you'll mitigate it
Keep it under 180 words. Just the plan. No prose preamble.
`.trim();

const BUILD_INSTRUCTIONS = `
You are now in BUILD phase. Execute the plan you just wrote. Produce the FINAL deliverable — the polished, ready-to-ship version — exactly as planned. Wrap any artifact in <artifact …> tags per the system prompt. Lead with one short sentence introducing it, then the artifact, then ONE line of outro at most.
`.trim();

const CRITIQUE_INSTRUCTIONS = `
You are in CRITIQUE phase. Review the deliverable you just produced as if you were a tough senior reviewer. Identify up to 3 SPECIFIC, ACTIONABLE issues that would meaningfully improve quality (not nitpicks). For each issue: name it and propose the concrete fix. If the answer is already excellent, say so in one line. Under 150 words.
`.trim();

const POLISH_INSTRUCTIONS = `
You are in POLISH phase. Take the critique seriously: re-emit the FULL final deliverable with the critiqued issues fixed. Reuse the SAME artifact identifier so it versions in place. Do NOT explain what you changed — just deliver the polished version.
`.trim();

/** Run a single phase through /api/chat and return the streamed text + usage. */
async function runPhase(
  phase: UltraPhase,
  args: UltraThinkArgs,
  history: UltraThinkArgs["messages"],
  phaseInstruction: string,
  temperature: number,
  emitDeltaToUi: boolean,
): Promise<{ text: string; usage?: { prompt: number; completion: number; cost: number }; errorEv?: StreamEvent; fallbackEv?: StreamEvent }> {
  const model = findModel(args.modelId);
  const maxTokens = args.maxTokens ?? Math.min(4096, model?.context ? Math.floor(model.context / 8) : 4096);

  const messages = [
    ...history,
    { role: "user" as const, content: `[${phase.toUpperCase()} PHASE INSTRUCTION]\n${phaseInstruction}` },
  ];

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      modelId: args.modelId,
      messages,
      temperature,
      maxTokens,
      apiKey: args.apiKey,
      artifactMode: false, // system prompt already includes the primer
    }),
  });
  if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "request failed"));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let cleanText = "";
  let errorEv: StreamEvent | undefined;
  let fallbackEv: StreamEvent | undefined;
  let usage: { prompt: number; completion: number; cost: number } | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    const parsed = parseStreamBuffer(raw);
    cleanText = parsed.text;
    for (const ev of parsed.events) {
      if (ev.kind === "error") errorEv = ev;
      else if (ev.kind === "fallback") fallbackEv = ev;
      else if (ev.kind === "usage") {
        usage = {
          prompt: ev.promptTokens ?? 0,
          completion: ev.completionTokens ?? 0,
          cost: ev.costUSD ?? 0,
        };
        args.onUsage?.(ev);
      }
    }
    args.onPhase?.(phase, cleanText, "running");
    if (emitDeltaToUi) args.onDelta?.(cleanText);
  }

  args.onPhase?.(phase, cleanText, "done");
  return { text: cleanText, usage, errorEv, fallbackEv };
}

/**
 * Run the full ultra-think pipeline. Phases executed depend on the mode.
 */
export async function runUltraThink(args: UltraThinkArgs): Promise<UltraThinkResult> {
  const info = ULTRA_MODES[args.mode];
  const history: UltraThinkArgs["messages"] = [
    { role: "system", content: args.systemPrompt },
    ...args.messages,
  ];

  let totalPrompt = 0, totalCompletion = 0, totalCost = 0;
  let errorEvent: StreamEvent | undefined;
  let fallbackEvent: StreamEvent | undefined;
  const accUsage = (u?: { prompt: number; completion: number; cost: number }) => {
    if (!u) return;
    totalPrompt += u.prompt; totalCompletion += u.completion; totalCost += u.cost;
  };

  // ── standard / plus: single-phase answer, just streamed straight through ──
  if (args.mode === "standard" || args.mode === "plus") {
    const r = await runPhase(
      "build",
      args,
      args.messages,
      "Answer the user's latest message directly. Use artifacts where they help.",
      info.buildTemperature,
      /* emit to UI */ true,
    );
    accUsage(r.usage);
    return {
      text: r.text,
      promptTokens: totalPrompt, completionTokens: totalCompletion, costUSD: totalCost,
      errorEvent: r.errorEv, fallbackEvent: r.fallbackEv,
    };
  }

  // ── ultra: plan → build → (critique → polish if mode === ultra+) ──
  const planRes = await runPhase("plan", args, args.messages, PLAN_INSTRUCTIONS, info.planTemperature, false);
  accUsage(planRes.usage);
  errorEvent ??= planRes.errorEv; fallbackEvent ??= planRes.fallbackEv;

  const afterPlanHistory: UltraThinkArgs["messages"] = [
    ...args.messages,
    { role: "assistant", content: `Plan:\n${planRes.text}` },
  ];

  const buildRes = await runPhase("build", args, afterPlanHistory, BUILD_INSTRUCTIONS, info.buildTemperature, true);
  accUsage(buildRes.usage);
  errorEvent ??= buildRes.errorEv; fallbackEvent ??= buildRes.fallbackEv;

  // Hermes mode adds critique + polish.
  if (args.mode !== "hermes") {
    return {
      text: buildRes.text,
      plan: planRes.text,
      promptTokens: totalPrompt, completionTokens: totalCompletion, costUSD: totalCost,
      errorEvent, fallbackEvent,
    };
  }

  const afterBuildHistory: UltraThinkArgs["messages"] = [
    ...afterPlanHistory,
    { role: "assistant", content: buildRes.text },
  ];
  const critiqueRes = await runPhase("critique", args, afterBuildHistory, CRITIQUE_INSTRUCTIONS, 0.4, false);
  accUsage(critiqueRes.usage);

  const polishHistory: UltraThinkArgs["messages"] = [
    ...afterBuildHistory,
    { role: "assistant", content: `Critique:\n${critiqueRes.text}` },
  ];
  const polishRes = await runPhase("polish", args, polishHistory, POLISH_INSTRUCTIONS, info.buildTemperature, true);
  accUsage(polishRes.usage);
  errorEvent ??= polishRes.errorEv; fallbackEvent ??= polishRes.fallbackEv;

  return {
    text: polishRes.text,
    plan: planRes.text,
    critique: critiqueRes.text,
    promptTokens: totalPrompt, completionTokens: totalCompletion, costUSD: totalCost,
    errorEvent, fallbackEvent,
  };
}

// Mark args used by Hermes for clarity (referenced via signature only above).
void ULTRA_MODES;
