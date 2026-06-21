// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Capability Layer — Modes
//
// "Ultra mode" is a knob the user can dial across every LLM surface. It maps to
// a reasoning strategy + a tool budget + a system-prompt primer. The same model
// is dramatically more capable in `ultra` than in `standard` because we change
// HOW it's invoked, not just what it's asked.
//
//   standard  — one shot. Fastest, cheapest. Default.
//   plus      — single-shot but with deep-thinking primer + creator scaffolds.
//   ultra     — plan → act → self-critique → finalise (multi-turn client side).
//   hermes    — full agent loop with tools, memory, sub-agents (Atlas-grade).
//
// Lower-cost surfaces (Compare, single-cell answers) cap at `ultra`. Higher-cost
// surfaces (Playground, /code) can ride all the way to `hermes`.
// ─────────────────────────────────────────────────────────────────────────────

export type UltraMode = "standard" | "plus" | "ultra" | "hermes";

export interface UltraModeInfo {
  id: UltraMode;
  label: string;
  emoji: string;
  blurb: string;
  /** Soft-budget hint: roughly how many extra API calls the mode may spend. */
  callBudget: number;
  /** Recommended sampling temperature for the planning phase. */
  planTemperature: number;
  /** Recommended sampling temperature for the build phase. */
  buildTemperature: number;
}

export const ULTRA_MODES: Record<UltraMode, UltraModeInfo> = {
  standard: {
    id: "standard",
    label: "Standard",
    emoji: "⚡",
    blurb: "One shot — fast and cheap.",
    callBudget: 1,
    planTemperature: 0.7,
    buildTemperature: 0.7,
  },
  plus: {
    id: "plus",
    label: "Plus",
    emoji: "✨",
    blurb: "Deep-thinking primer + creator scaffolds in one pass.",
    callBudget: 1,
    planTemperature: 0.5,
    buildTemperature: 0.6,
  },
  ultra: {
    id: "ultra",
    label: "Ultra Think",
    emoji: "🧠",
    blurb: "Plan → build → self-critique → polish. Best quality / single answer.",
    callBudget: 3,
    planTemperature: 0.3,
    buildTemperature: 0.5,
  },
  hermes: {
    id: "hermes",
    label: "Hermes Agent",
    emoji: "🤖",
    blurb: "Full tool-using agent: web, memory, sub-agents, multi-step execution.",
    callBudget: 12,
    planTemperature: 0.2,
    buildTemperature: 0.4,
  },
};

/** Hard upper bound per surface — defends against silly choices. */
export function clampModeForSurface(
  mode: UltraMode,
  surface: "playground" | "compare" | "atlas" | "code" | "learn" | "embed",
): UltraMode {
  const order: UltraMode[] = ["standard", "plus", "ultra", "hermes"];
  const cap: Record<typeof surface, UltraMode> = {
    playground: "hermes",
    compare: "ultra",          // hermes-per-column would be ruinous; ultra is enough
    atlas: "hermes",
    code: "hermes",
    learn: "ultra",
    embed: "plus",
  };
  const max = order.indexOf(cap[surface]);
  const cur = order.indexOf(mode);
  return order[Math.min(cur, max)];
}

/** The system-prompt primer for a given mode (mode-independent of capability). */
export function modePrimer(mode: UltraMode): string {
  switch (mode) {
    case "standard":
      return "";
    case "plus":
      return PLUS_PRIMER;
    case "ultra":
      return ULTRA_PRIMER;
    case "hermes":
      return HERMES_PRIMER;
  }
}

// ─── Primers ─────────────────────────────────────────────────────────────────

const PLUS_PRIMER = `
DEEP-THINKING MODE — Before you answer, take a single breath and consider:
  1. What does the user ACTUALLY want? (The literal request vs. the underlying goal.)
  2. What format / artifact best delivers it?
  3. What's the strongest version of this answer — what would a world-class expert produce?
Then produce that. Aim for surprising quality, not safe minimum. Lead with the answer; explanation follows.
`.trim();

const ULTRA_PRIMER = `
ULTRA-THINK MODE — Use this internal structure for every non-trivial request:

  <thinking>
  Step 1 — Restate the goal in one sentence and surface any hidden constraints.
  Step 2 — Brainstorm 2-3 distinct approaches; pick the strongest and say why in one line.
  Step 3 — Draft a tight outline / file list / slide list / argument structure.
  Step 4 — Identify the single biggest risk to quality and how you'll avoid it.
  </thinking>

Then produce the FINAL artifact directly. Do NOT show <thinking> blocks in your visible response — keep them internal. After the artifact, do a one-line self-critique ("What I'd improve next:") so the user can iterate.

Quality bar is "would this impress on first look?" — pixel-polished UI, real content, complete edge cases, no TODOs.
`.trim();

const HERMES_PRIMER = `
HERMES-AGENT MODE — You are an autonomous executor. For each user request:

  1. THINK — internally restate the goal, list the steps, and pick tools.
  2. ACT — call tools one at a time. After every result, decide the next step.
  3. OBSERVE — if a tool fails or the result conflicts with the plan, ADJUST. Never plow on.
  4. SYNTHESISE — at the end produce a single clear answer that resolves the original request.

When the task is multi-part or comparative, delegate to parallel sub-agents and synthesise their findings. Prefer the smallest tool set that gets the job done. NEVER fabricate tool output. NEVER ask permission for read-only actions — just take them.
`.trim();
