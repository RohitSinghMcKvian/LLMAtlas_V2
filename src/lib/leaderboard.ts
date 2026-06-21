// Global LLM Leaderboard — domain layer.
//
// Single source of truth for the /leaderboard experience: multi-benchmark
// scoring (real where published, derived + clearly flagged "estimated"
// otherwise), composite ranking, a modeled usage/market-share signal in the
// spirit of openrouter.ai/rankings (OpenRouter does NOT expose token-usage
// numbers publicly, so these are deterministic estimates), provider
// aggregation, and a curated radar of upcoming models.
//
// Built on top of the live-ish catalogue in models.ts.

import {
  MODELS,
  PROVIDERS,
  type ModelSpec,
  type Modality,
  type ProviderId,
} from "@/lib/models";

// ─────────────────────────── Benchmarks ─────────────────────────────────────

export type BenchKey =
  | "mmluPro"
  | "gpqa"
  | "humanEval"
  | "sweBench"
  | "math"
  | "arenaElo"
  | "mmmu";

export type BenchCategory =
  | "knowledge"
  | "reasoning"
  | "coding"
  | "agentic"
  | "math"
  | "arena"
  | "vision";

export interface BenchmarkDef {
  key: BenchKey;
  label: string;
  short: string;
  category: BenchCategory;
  /** Display ceiling used to normalise the cell to 0–100 for the heatmap. */
  max: number;
  unit: string;
  description: string;
}

export const BENCHMARKS: BenchmarkDef[] = [
  {
    key: "mmluPro", label: "MMLU-Pro", short: "MMLU", category: "knowledge",
    max: 100, unit: "%",
    description:
      "Massive Multitask Language Understanding (Pro) — 12K hard questions across 14 domains. The standard broad-knowledge & reasoning yardstick.",
  },
  {
    key: "gpqa", label: "GPQA Diamond", short: "GPQA", category: "reasoning",
    max: 100, unit: "%",
    description:
      "Graduate-level Google-Proof Q&A (Diamond split) — PhD-level biology, physics & chemistry questions experts can't easily Google. Probes deep reasoning.",
  },
  {
    key: "humanEval", label: "HumanEval", short: "HEval", category: "coding",
    max: 100, unit: "%",
    description:
      "OpenAI's 164 hand-written Python problems graded pass@1. The classic single-function code-generation benchmark.",
  },
  {
    key: "sweBench", label: "SWE-bench Verified", short: "SWE", category: "agentic",
    max: 100, unit: "%",
    description:
      "Real GitHub issues resolved end-to-end against a repo's test suite. The leading agentic / real-world software-engineering benchmark — scores run far lower than HumanEval.",
  },
  {
    key: "math", label: "MATH-500 / AIME", short: "MATH", category: "math",
    max: 100, unit: "%",
    description:
      "Competition mathematics (MATH-500 + AIME-style problems). Rewards step-by-step symbolic reasoning; reasoning models dominate here.",
  },
  {
    key: "arenaElo", label: "LMArena Elo", short: "Arena", category: "arena",
    max: 1500, unit: "Elo",
    description:
      "Human-preference Elo from blind head-to-head chat votes (LMArena / Chatbot Arena style). Captures real-world helpfulness rather than exam skill.",
  },
  {
    key: "mmmu", label: "MMMU", short: "MMMU", category: "vision",
    max: 100, unit: "%",
    description:
      "Massive Multi-discipline Multimodal Understanding — college-level questions requiring image comprehension. Only meaningful for vision-capable models.",
  },
];

export const BENCHMARK_BY_KEY: Record<BenchKey, BenchmarkDef> = Object.fromEntries(
  BENCHMARKS.map((b) => [b.key, b]),
) as Record<BenchKey, BenchmarkDef>;

export type BenchScores = Partial<Record<BenchKey, number>>;

// ── Curated, published-grade scores for flagship families ────────────────────
// Keyed by canonical family (vendor + clean core name) so the same model gets
// identical real numbers regardless of which provider hosts it. Sources:
// vendor model cards + public LMArena / SWE-bench / GPQA reports (approximate,
// snapshotted; see methodology disclosure on the page).
const CURATED_BENCHMARKS: Record<string, BenchScores> = {
  "anthropic|claude opus 4.8":   { mmluPro: 89, gpqa: 84, humanEval: 96, sweBench: 73, math: 90, arenaElo: 1448, mmmu: 79 },
  "anthropic|claude 4 sonnet":   { mmluPro: 86, gpqa: 78, humanEval: 94, sweBench: 70, math: 86, arenaElo: 1402, mmmu: 75 },
  "anthropic|claude 4.5 haiku":  { mmluPro: 80, gpqa: 67, humanEval: 88, sweBench: 55, math: 78, arenaElo: 1330, mmmu: 68 },
  "anthropic|claude 3.5 sonnet": { mmluPro: 84, gpqa: 65, humanEval: 92, sweBench: 49, math: 78, arenaElo: 1370, mmmu: 70 },
  "anthropic|claude 3 haiku":    { mmluPro: 70, gpqa: 49, humanEval: 76, sweBench: 28, math: 60, arenaElo: 1270, mmmu: 58 },
  "anthropic|claude":            { mmluPro: 85, gpqa: 76, humanEval: 92, sweBench: 65, math: 84, arenaElo: 1395, mmmu: 73 },

  "openai|gpt 5.5":              { mmluPro: 90, gpqa: 86, humanEval: 96, sweBench: 72, math: 94, arenaElo: 1452, mmmu: 80 },
  "openai|gpt 4.1":              { mmluPro: 87, gpqa: 67, humanEval: 92, sweBench: 55, math: 82, arenaElo: 1405, mmmu: 74 },
  "openai|gpt 4o":               { mmluPro: 82, gpqa: 54, humanEval: 90, sweBench: 33, math: 76, arenaElo: 1340, mmmu: 70 },
  "openai|o1":                   { mmluPro: 89, gpqa: 78, humanEval: 92, sweBench: 49, math: 95, arenaElo: 1390 },
  "openai|o3 mini":              { mmluPro: 86, gpqa: 79, humanEval: 91, sweBench: 49, math: 95, arenaElo: 1360 },
  "openai|gpt oss 120b":         { mmluPro: 81, gpqa: 72, humanEval: 87, sweBench: 48, math: 88, arenaElo: 1352 },
  "openai|gpt oss 20b":          { mmluPro: 74, gpqa: 62, humanEval: 80, sweBench: 38, math: 80, arenaElo: 1300 },

  "google|gemini 2.5 pro":       { mmluPro: 86, gpqa: 84, humanEval: 94, sweBench: 64, math: 92, arenaElo: 1440, mmmu: 79 },
  "google|gemini 2.5 flash":     { mmluPro: 80, gpqa: 68, humanEval: 88, sweBench: 48, math: 84, arenaElo: 1390, mmmu: 72 },
  "google|gemini 2.0 flash":     { mmluPro: 77, gpqa: 60, humanEval: 84, sweBench: 38, math: 78, arenaElo: 1356, mmmu: 70 },
  "google|gemini 3.5 flash":     { mmluPro: 83, gpqa: 74, humanEval: 90, sweBench: 55, math: 88, arenaElo: 1410, mmmu: 76 },

  "deepseek|deepseek v4 pro":    { mmluPro: 88, gpqa: 80, humanEval: 95, sweBench: 68, math: 93, arenaElo: 1430 },
  "deepseek|deepseek v4":        { mmluPro: 85, gpqa: 74, humanEval: 92, sweBench: 60, math: 90, arenaElo: 1400 },
  "deepseek|deepseek v4 flash":  { mmluPro: 81, gpqa: 68, humanEval: 88, sweBench: 52, math: 86, arenaElo: 1360 },
  "deepseek|deepseek r1":        { mmluPro: 84, gpqa: 71, humanEval: 90, sweBench: 49, math: 95, arenaElo: 1382 },
  "deepseek|deepseek r1 0528":   { mmluPro: 85, gpqa: 76, humanEval: 91, sweBench: 52, math: 95, arenaElo: 1395 },
  "deepseek|deepseek v3":        { mmluPro: 81, gpqa: 59, humanEval: 89, sweBench: 42, math: 84, arenaElo: 1370 },
  "deepseek|deepseek coder v3":  { mmluPro: 76, gpqa: 52, humanEval: 92, sweBench: 55, math: 78, arenaElo: 1320 },

  "meta|llama 4 maverick":       { mmluPro: 84, gpqa: 70, humanEval: 88, sweBench: 45, math: 80, arenaElo: 1410, mmmu: 73 },
  "meta|llama 4 scout":          { mmluPro: 79, gpqa: 62, humanEval: 82, sweBench: 36, math: 72, arenaElo: 1360, mmmu: 68 },
  "meta|llama 3.3 70b":          { mmluPro: 77, gpqa: 51, humanEval: 84, sweBench: 33, math: 73, arenaElo: 1340 },
  "meta|llama 3.1 405b":         { mmluPro: 79, gpqa: 51, humanEval: 85, sweBench: 35, math: 73, arenaElo: 1352 },

  "alibaba|qwen3 235b":          { mmluPro: 84, gpqa: 71, humanEval: 90, sweBench: 50, math: 90, arenaElo: 1400 },
  "alibaba|qwen3 coder":         { mmluPro: 76, gpqa: 55, humanEval: 92, sweBench: 58, math: 76, arenaElo: 1330 },
  "alibaba|qwen3 next 80b":      { mmluPro: 80, gpqa: 64, humanEval: 86, sweBench: 44, math: 82, arenaElo: 1372 },

  "nvidia|nemotron 3 ultra":     { mmluPro: 87, gpqa: 79, humanEval: 92, sweBench: 60, math: 90, arenaElo: 1420 },
  "nvidia|nemotron 3 super 120b":{ mmluPro: 83, gpqa: 72, humanEval: 88, sweBench: 50, math: 85, arenaElo: 1385 },

  "moonshot ai|kimi k2.6":       { mmluPro: 82, gpqa: 69, humanEval: 93, sweBench: 65, math: 84, arenaElo: 1418 },
  "xai|grok 4":                  { mmluPro: 86, gpqa: 80, humanEval: 90, sweBench: 56, math: 90, arenaElo: 1425, mmmu: 74 },
  "xai|grok 3":                  { mmluPro: 80, gpqa: 67, humanEval: 86, sweBench: 42, math: 82, arenaElo: 1402 },
  "mistral|mistral large":       { mmluPro: 78, gpqa: 56, humanEval: 86, sweBench: 38, math: 74, arenaElo: 1358 },
  "mistral|mistral large 3":     { mmluPro: 83, gpqa: 70, humanEval: 89, sweBench: 50, math: 84, arenaElo: 1390 },
  "minimax|minimax m3":          { mmluPro: 83, gpqa: 71, humanEval: 88, sweBench: 52, math: 85, arenaElo: 1395, mmmu: 72 },
  "nousresearch|hermes 3 405b":  { mmluPro: 79, gpqa: 50, humanEval: 84, sweBench: 30, math: 70, arenaElo: 1330 },
};

/**
 * Canonical family key for a model — vendor + a cleaned core name with all
 * host/format/marketing qualifiers stripped, so e.g. "Llama 4 Maverick (Groq)",
 * "Llama 4 Maverick (keyless)" and "Llama 4 Maverick" all collapse to one key.
 */
function familyKey(m: ModelSpec): string {
  let n = m.name.toLowerCase();
  n = n.replace(/\([^)]*\)/g, " "); // drop any parenthetical qualifier
  // strip host / format / marketing tokens
  n = n.replace(
    /\b(free|keyless|via|github|groq|nvidia|cloudflare|cerebras|together|openrouter|pollinations|turbo|instruct|fp8|awq|latest|edition|beta|chat|reasoning|fast|it|a\d+b|\d+e|\d{2,3}b|distill|venice|tput)\b/g,
    " ",
  );
  n = n.replace(/[^a-z0-9.+ ]/g, " ").replace(/\s+/g, " ").trim();
  return `${m.vendor.toLowerCase()}|${n}`;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function hasTag(m: ModelSpec, ...tags: string[]): boolean {
  return m.tags.some((t) => tags.includes(t));
}

/**
 * Derive a plausible multi-benchmark profile from the catalogue's single
 * composite + tags + modalities. Deterministic and monotonic with quality, so
 * estimated rows stay coherent with their composite. Flagged estimated by
 * getBenchmarks().
 */
function deriveBenchmarks(m: ModelSpec): BenchScores {
  const q = m.benchmark ?? 50;
  const code = hasTag(m, "code", "developer", "tools", "fim", "sql", "agentic") ? 6 : 0;
  const reason = hasTag(m, "reasoning", "thinking") ? 5 : 0;
  const mathT = hasTag(m, "math", "proofs") ? 10 : hasTag(m, "reasoning", "thinking") ? 6 : 0;
  const small = hasTag(m, "tiny", "micro", "nano", "small", "classic", "edge") ? 8 : 0;
  const vision = m.modalities.includes("vision");

  const scores: BenchScores = {
    mmluPro: clamp(q - small * 0.4),
    // GPQA is harder than MMLU and punishes small models heavily
    gpqa: clamp((q - 40) * 1.15 + reason - small * 1.4),
    humanEval: clamp(q + code - small * 0.5),
    // SWE-bench runs on a much lower scale even for frontier models
    sweBench: clamp((q - 45) * 1.25 + code * 1.4 - small * 1.6, 0, 78),
    math: clamp(q + mathT - small * 0.6),
    arenaElo: clamp(1000 + (q - 40) * 9 + reason * 2, 950, 1480),
  };
  if (vision) scores.mmmu = clamp(q * 0.86 - small * 0.5);
  return scores;
}

export function getBenchmarks(m: ModelSpec): { scores: BenchScores; estimated: boolean } {
  const curated = CURATED_BENCHMARKS[familyKey(m)];
  if (curated) return { scores: curated, estimated: false };
  return { scores: deriveBenchmarks(m), estimated: true };
}

// ─────────────────────────── Composite scoring ──────────────────────────────

export const SCORING_WEIGHTS = [
  { label: "Quality", weight: 0.35, color: "bg-blue-500",
    desc: "Composite benchmark — MMLU-Pro, GPQA, HumanEval, SWE-bench, MATH & LMArena. Real where published, otherwise derived." },
  { label: "Speed", weight: 0.20, color: "bg-amber-500",
    desc: "Measured throughput by provider hardware. Groq & Cerebras top the charts with LPU / wafer-scale silicon." },
  { label: "Context", weight: 0.15, color: "bg-violet-500",
    desc: "Log-normalised context window. 2M tokens = 100, 1M ≈ 91, 128K ≈ 64, 8K ≈ 28." },
  { label: "Openness", weight: 0.15, color: "bg-emerald-500",
    desc: "100 for fully open weights (MIT/Apache), 30 for closed/proprietary. Open = reproducible, auditable, self-hostable." },
  { label: "Value", weight: 0.15, color: "bg-rose-500",
    desc: "100 for free tiers, scaled inversely with price per token. Free APIs score 100; frontier-paid ~28." },
] as const;

export interface LeaderboardRow {
  model: ModelSpec;
  quality: number;
  speed: number;
  contextScore: number;
  openness: number;
  value: number;
  composite: number;
  bench: BenchScores;
  benchEstimated: boolean;
  /** Modeled market share (%) — estimated, see disclosure. Sums to ~100 across catalogue. */
  usageShare: number;
  /** Estimated tokens processed per week, in billions. */
  tokensPerWeek: number;
  /** Week-over-week trend, in rank-points (+ up, − down). Estimated. */
  trend: number;
  /** 8-point series for the trend sparkline. */
  spark: number[];
}

function contextScore(ctx: number): number {
  return clamp((Math.log(ctx / 1000) / Math.log(2000)) * 100);
}

function baseScores(m: ModelSpec) {
  const quality = m.benchmark ?? 50;
  const speed = m.speedScore ?? 50;
  const ctx = contextScore(m.context);
  const openness = m.openSource ? 100 : 30;
  const value = m.free ? 100 : m.inputPrice < 0.5 ? 72 : m.inputPrice < 2 ? 50 : 28;
  const composite = Math.round(
    quality * 0.35 + speed * 0.2 + ctx * 0.15 + openness * 0.15 + value * 0.15,
  );
  return { quality, speed, contextScore: ctx, openness, value, composite };
}

/** Deterministic 0–1 pseudo-random from a string seed (mulberry-ish hash). */
function seeded(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

const FAMOUS_VENDORS = new Set([
  "OpenAI", "Anthropic", "Google", "Meta", "DeepSeek", "Alibaba", "Mistral", "xAI", "Nvidia",
]);

/** Total modeled weekly tokens across the catalogue (billions) — for share→volume. */
const GLOBAL_TOKENS_B = 2_400;

function popularityWeight(m: ModelSpec, composite: number): number {
  let w = Math.pow(composite / 100, 3) * 100; // heavy skew toward the frontier
  if (FAMOUS_VENDORS.has(m.vendor)) w *= 1.8;
  if (m.free) w *= 1.25;
  if (hasTag(m, "frontier", "frontier-free")) w *= 1.3;
  if (hasTag(m, "code", "agentic")) w *= 1.15;
  if (hasTag(m, "tiny", "micro", "nano", "classic")) w *= 0.4;
  w *= 0.75 + 0.5 * seeded(m.id + "pop"); // deterministic jitter so it isn't perfectly monotonic
  return w;
}

function buildRows(): LeaderboardRow[] {
  const partial = MODELS.map((m) => {
    const base = baseScores(m);
    const { scores, estimated } = getBenchmarks(m);
    const weight = popularityWeight(m, base.composite);
    return { m, base, scores, estimated, weight };
  });
  const totalWeight = partial.reduce((s, p) => s + p.weight, 0);

  return partial.map(({ m, base, scores, estimated, weight }) => {
    const usageShare = (weight / totalWeight) * 100;
    const tokensPerWeek = (usageShare / 100) * GLOBAL_TOKENS_B;
    // newer models trend up; deterministic spread in [-7, +13]
    const recent = (m.released ?? "2024-01") >= "2025-01";
    const trend = Math.round((seeded(m.id + "trend") - (recent ? 0.35 : 0.5)) * 20);
    const spark = Array.from({ length: 8 }, (_, i) => {
      const drift = (trend / 8) * i;
      const noise = (seeded(m.id + "s" + i) - 0.5) * 6;
      return Math.max(2, Math.round(base.composite - trend + drift + noise));
    });
    return {
      model: m,
      ...base,
      bench: scores,
      benchEstimated: estimated,
      usageShare,
      tokensPerWeek,
      trend,
      spark,
    };
  });
}

/** All rows, ranked by composite desc (stable, computed once). */
export const LEADERBOARD_ROWS: LeaderboardRow[] = buildRows().sort(
  (a, b) => b.composite - a.composite,
);

const RANK_BY_ID = new Map(LEADERBOARD_ROWS.map((r, i) => [r.model.id, i + 1]));

/** Global rank (1-based) of a model in the composite leaderboard. */
export function rankOf(id: string): number {
  return RANK_BY_ID.get(id) ?? 0;
}

// ─────────────────────────── Filters & sorting ──────────────────────────────

export type CategoryFilter =
  | "all" | "free" | "frontier" | "fastest" | "vision" | "code" | "reasoning" | "open";

export const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "frontier", label: "Frontier" },
  { id: "fastest", label: "Fastest" },
  { id: "reasoning", label: "Reasoning" },
  { id: "code", label: "Code" },
  { id: "vision", label: "Vision" },
  { id: "open", label: "Open" },
];

export function matchesCategory(r: LeaderboardRow, c: CategoryFilter): boolean {
  const m = r.model;
  switch (c) {
    case "all":       return true;
    case "free":      return m.free;
    case "frontier":  return r.quality >= 85;
    case "fastest":   return r.speed >= 90;
    case "vision":    return m.modalities.includes("vision");
    case "code":      return hasTag(m, "code", "developer", "tools") || m.modalities.includes("code");
    case "reasoning": return hasTag(m, "reasoning", "thinking", "math");
    case "open":      return m.openSource;
  }
}

export type SortCol =
  | "composite" | "quality" | "speed" | "contextScore" | "value" | "usageShare";

export function sortValue(r: LeaderboardRow, col: SortCol): number {
  switch (col) {
    case "composite":    return r.composite;
    case "quality":      return r.quality;
    case "speed":        return r.speed;
    case "contextScore": return r.contextScore;
    case "value":        return r.value;
    case "usageShare":   return r.usageShare;
  }
}

// ─────────────────────────── Provider aggregation ───────────────────────────

export interface ProviderAgg {
  id: ProviderId;
  name: string;
  color: string;
  count: number;
  freeCount: number;
  avgComposite: number;
  avgSpeed: number;
  best: LeaderboardRow;
  share: number; // summed modeled usage share %
}

export function aggregateProviders(): ProviderAgg[] {
  const groups = new Map<ProviderId, LeaderboardRow[]>();
  for (const r of LEADERBOARD_ROWS) {
    const arr = groups.get(r.model.provider) ?? [];
    arr.push(r);
    groups.set(r.model.provider, arr);
  }
  const out: ProviderAgg[] = [];
  for (const [id, rows] of groups) {
    const meta = PROVIDERS[id];
    const best = rows.reduce((a, b) => (b.composite > a.composite ? b : a));
    out.push({
      id,
      name: meta.name,
      color: meta.color,
      count: rows.length,
      freeCount: rows.filter((r) => r.model.free).length,
      avgComposite: Math.round(rows.reduce((s, r) => s + r.composite, 0) / rows.length),
      avgSpeed: Math.round(rows.reduce((s, r) => s + r.speed, 0) / rows.length),
      best,
      share: rows.reduce((s, r) => s + r.usageShare, 0),
    });
  }
  return out.sort((a, b) => b.avgComposite - a.avgComposite);
}

// ─────────────────────────── Upcoming models ────────────────────────────────

export type UpcomingStatus = "rumored" | "announced" | "preview";

export interface UpcomingModel {
  id: string;
  name: string;
  vendor: string;
  status: UpcomingStatus;
  /** Human window, e.g. "Q3 2026". */
  expected: string;
  /** Sortable yyyymm-ish key for ordering the radar. */
  expectedSort: number;
  context?: number;
  modalities?: Modality[];
  description: string;
  /** Projected composite-quality (0–100) — speculative. */
  expectedBenchmark?: number;
  /** Community anticipation 0–100. */
  hype: number;
  tags: string[];
  highlights: string[];
}

// Curated as of 2026-06. Everything here is the NEXT generation beyond what is
// already shipping in the catalogue — explicitly speculative / projected.
export const UPCOMING_MODELS: UpcomingModel[] = [
  {
    id: "u-gpt-6", name: "GPT-6", vendor: "OpenAI", status: "rumored",
    expected: "Q4 2026", expectedSort: 202610, context: 2_000_000,
    modalities: ["text", "vision"], expectedBenchmark: 97, hype: 98,
    description:
      "OpenAI's next frontier flagship — unified reasoning + multimodal, expected to push agentic SWE-bench past 80% with a 2M-token context.",
    tags: ["frontier", "reasoning", "agentic", "vision", "long-context"],
    highlights: ["Unified reasoning model", "2M-token context", "Native agent tooling"],
  },
  {
    id: "u-o4", name: "o4", vendor: "OpenAI", status: "announced",
    expected: "Q3 2026", expectedSort: 202608, context: 256_000,
    modalities: ["text"], expectedBenchmark: 95, hype: 90,
    description:
      "Successor to the o-series reasoning line — deeper deliberate chains, near-saturated AIME/MATH, with visible thinking traces.",
    tags: ["reasoning", "thinking", "math", "code"],
    highlights: ["Deliberate reasoning", "AIME near-saturation", "Tool-use during thinking"],
  },
  {
    id: "u-claude-opus-5", name: "Claude Opus 5", vendor: "Anthropic", status: "rumored",
    expected: "Q4 2026", expectedSort: 202611, context: 500_000,
    modalities: ["text", "vision", "code"], expectedBenchmark: 97, hype: 96,
    description:
      "Anthropic's next Opus tier — projected to set a new SWE-bench Verified high-water mark and extend the context window to 500K.",
    tags: ["frontier", "reasoning", "agentic", "code", "vision"],
    highlights: ["Agentic coding leader", "500K context", "Stronger computer-use"],
  },
  {
    id: "u-gemini-3-ultra", name: "Gemini 3 Ultra", vendor: "Google", status: "announced",
    expected: "Q3 2026", expectedSort: 202609, context: 2_000_000,
    modalities: ["text", "vision", "code"], expectedBenchmark: 96, hype: 94,
    description:
      "Google's largest Gemini 3 tier — natively multimodal with audio + video understanding and a 2M-token window via AI Studio.",
    tags: ["frontier", "reasoning", "vision", "long-context", "multimodal"],
    highlights: ["Video + audio native", "2M context", "Deep Think mode"],
  },
  {
    id: "u-llama-5", name: "Llama 5", vendor: "Meta", status: "rumored",
    expected: "Q4 2026", expectedSort: 202612, context: 1_000_000,
    modalities: ["text", "vision"], expectedBenchmark: 93, hype: 92,
    description:
      "Meta's next open-weights generation — expected to close the gap to closed frontier models while staying fully open & self-hostable.",
    tags: ["frontier", "open", "moe", "vision", "long-context"],
    highlights: ["Open weights", "Frontier-class MoE", "Permissive license"],
  },
  {
    id: "u-deepseek-r2", name: "DeepSeek R2", vendor: "DeepSeek", status: "announced",
    expected: "Q3 2026", expectedSort: 202607, context: 256_000,
    modalities: ["text", "code"], expectedBenchmark: 95, hype: 93,
    description:
      "The reasoning successor to R1 — longer, cheaper chains of thought and open weights, aiming at o4-class MATH and SWE-bench.",
    tags: ["frontier", "open", "reasoning", "thinking", "math", "code"],
    highlights: ["Open reasoning weights", "Ultra-cheap inference", "MoE 700B+"],
  },
  {
    id: "u-qwen4-max", name: "Qwen4-Max", vendor: "Alibaba", status: "rumored",
    expected: "Q3 2026", expectedSort: 202609, context: 524_288,
    modalities: ["text", "vision"], expectedBenchmark: 93, hype: 86,
    description:
      "Alibaba's next flagship MoE — strong multilingual + coding, with an open community tier expected shortly after launch.",
    tags: ["frontier", "open", "moe", "multilingual", "code"],
    highlights: ["Top multilingual", "Open community tier", "Strong coding"],
  },
  {
    id: "u-grok-5", name: "Grok 5", vendor: "xAI", status: "rumored",
    expected: "Q4 2026", expectedSort: 202611, context: 512_000,
    modalities: ["text", "vision"], expectedBenchmark: 94, hype: 88,
    description:
      "xAI's next Grok — real-time X integration, larger context, and a reasoning mode targeting GPQA / frontier parity.",
    tags: ["frontier", "reasoning", "vision", "real-time"],
    highlights: ["Real-time data", "Reasoning mode", "512K context"],
  },
  {
    id: "u-kimi-k3", name: "Kimi K3", vendor: "Moonshot AI", status: "announced",
    expected: "Q3 2026", expectedSort: 202608, context: 524_288,
    modalities: ["text", "code"], expectedBenchmark: 91, hype: 84,
    description:
      "Moonshot's next trillion-parameter MoE — focused on agentic coding and long-horizon tool use with an even larger context.",
    tags: ["frontier", "agentic", "code", "moe", "long-context"],
    highlights: ["Agentic coding", "1T+ MoE", "512K context"],
  },
  {
    id: "u-mistral-large-4", name: "Mistral Large 4", vendor: "Mistral", status: "rumored",
    expected: "Q4 2026", expectedSort: 202610, context: 256_000,
    modalities: ["text", "code"], expectedBenchmark: 90, hype: 78,
    description:
      "Mistral's next flagship — European-sovereign frontier reasoning with strong multilingual and a generous open research license.",
    tags: ["frontier", "multilingual", "code", "reasoning"],
    highlights: ["EU-sovereign", "Multilingual leader", "Research license"],
  },
  {
    id: "u-nemotron-4", name: "Nemotron 4 Ultra", vendor: "Nvidia", status: "rumored",
    expected: "Q4 2026", expectedSort: 202612, context: 256_000,
    modalities: ["text", "code"], expectedBenchmark: 94, hype: 80,
    description:
      "NVIDIA's next Nemotron — RLHF-tuned open weights optimised for its own silicon, targeting top open-model reasoning.",
    tags: ["frontier", "open", "reasoning", "code", "nemotron"],
    highlights: ["Open weights", "RLHF-tuned", "GPU-optimised"],
  },
  {
    id: "u-phi-5", name: "Phi-5", vendor: "Microsoft", status: "rumored",
    expected: "Q3 2026", expectedSort: 202609, context: 131_072,
    modalities: ["text", "vision"], expectedBenchmark: 80, hype: 70,
    description:
      "Microsoft's next small-language-model — punching far above its size on reasoning, optimised for on-device & edge deployment.",
    tags: ["efficient", "small", "reasoning", "vision", "edge"],
    highlights: ["On-device ready", "SLM efficiency", "Open weights"],
  },
];

export const UPCOMING_BY_WINDOW: { window: string; sort: number; items: UpcomingModel[] }[] =
  (() => {
    const map = new Map<string, UpcomingModel[]>();
    for (const u of [...UPCOMING_MODELS].sort((a, b) => a.expectedSort - b.expectedSort)) {
      const arr = map.get(u.expected) ?? [];
      arr.push(u);
      map.set(u.expected, arr);
    }
    return [...map.entries()]
      .map(([window, items]) => ({ window, sort: items[0].expectedSort, items }))
      .sort((a, b) => a.sort - b.sort);
  })();

// ─────────────────────────── Live-sync shared types ─────────────────────────

export interface PriceOverride {
  context: number;
  inputPrice: number;
  outputPrice: number;
}

export interface NewModelHint {
  name: string;
  vendor: string;
  context: number;
  created: number; // unix seconds
}

/** Compact projection of an upstream OpenRouter model — the "world" catalogue. */
export interface GlobalModelLite {
  id: string;            // e.g. "anthropic/claude-fable-5"
  name: string;          // upstream display name (vendor prefix stripped)
  vendor: string;
  context: number;
  inputPrice: number;    // USD / 1M
  outputPrice: number;
  modalities: Modality[];
  created: number;       // unix seconds
  description?: string;
  /** True when this model is also in the bundled LLMAtlas catalogue. */
  inCatalog: boolean;
}

export interface SyncPayload {
  updatedAt: string; // ISO
  source: "live" | "fallback";
  liveModelCount: number;
  priceOverrides: Record<string, PriceOverride>; // keyed by local model id
  newModels: NewModelHint[];
  /** Full upstream catalogue projection for the Global tab. */
  globalModels: GlobalModelLite[];
}

// ─────────────────────────── Formatters ─────────────────────────────────────

export function formatContext(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(ctx % 1_000_000 === 0 ? 0 : 1)}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
  return `${ctx}`;
}

export function formatPrice(usdPerM: number): string {
  if (usdPerM === 0) return "Free";
  if (usdPerM < 1) return `$${usdPerM.toFixed(2)}`;
  return `$${usdPerM.toFixed(2)}`;
}

/** Tokens/week given in billions → "1.2T" / "340B" / "12B". */
export function formatTokens(billions: number): string {
  if (billions >= 1000) return `${(billions / 1000).toFixed(1)}T`;
  if (billions >= 1) return `${billions.toFixed(0)}B`;
  return `${(billions * 1000).toFixed(0)}M`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
