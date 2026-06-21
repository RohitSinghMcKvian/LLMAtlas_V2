// Global leaderboard — derive a composite & multi-benchmark profile for any
// upstream OpenRouter model (the "world" catalogue) using only its name +
// pricing + context + vendor signals. Known families fall through to the same
// CURATED_BENCHMARKS used by the LLMAtlas-catalogue leaderboard.

import {
  type GlobalModelLite, type BenchKey, type BenchScores,
  BENCHMARKS, BENCHMARK_BY_KEY, getBenchmarks,
} from "@/lib/leaderboard";
import { MODELS, type ModelSpec } from "@/lib/models";

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// ── Vendor reputation prior (0–100) — empirical, used as quality baseline ────
const VENDOR_PRIOR: Record<string, number> = {
  OpenAI: 90, Anthropic: 90, Google: 88, DeepSeek: 86, Meta: 84,
  Nvidia: 84, "Moonshot AI": 82, Alibaba: 82, xAI: 82, Mistral: 78,
  Microsoft: 76, MiniMax: 78, ZAI: 76, Cohere: 74, "Liquid AI": 64,
  NousResearch: 72, AI21: 72, "01.AI": 70, Inflection: 70, Perplexity: 76,
  Amazon: 74,
};

// ── Name-pattern signals (lowercased substring) — additive deltas to quality ─
interface Signal { match: RegExp; q?: number; speed?: number; tags?: string[]; bench?: Partial<BenchScores>; }
const SIGNALS: Signal[] = [
  { match: /\b(ultra|opus|max|405b|671b|253b|235b)\b/, q: 8, speed: -8 },
  { match: /\bpro\b/, q: 5, speed: -3 },
  { match: /\b(flash|mini|small|nano|haiku|turbo|fast)\b/, q: -4, speed: 10 },
  { match: /\b(tiny|micro|edge|1b|2b|3b)\b/, q: -16, speed: 14 },
  { match: /\b(thinking|reasoning|o1|o3|o4|r1|r2|prover)\b/, q: 5, tags: ["reasoning"], bench: { math: 12, gpqa: 8 } },
  { match: /\b(coder|coding|sweep|swe|fim)\b/, q: 2, tags: ["code"], bench: { humanEval: 8, sweBench: 10 } },
  { match: /\b(vision|vl|image|multimodal|omni|nano banana)\b/, tags: ["vision"], bench: { mmmu: 10 } },
  { match: /\b(maverick|scout|moe|mixture)\b/, q: 4 },
  { match: /\b(free)\b/, q: -1 },
];

const CONTEXT_BONUS = (ctx: number) => {
  if (ctx >= 2_000_000) return 4;
  if (ctx >= 1_000_000) return 3;
  if (ctx >= 200_000) return 2;
  if (ctx >= 128_000) return 1;
  if (ctx < 16_000) return -4;
  return 0;
};

const PRICE_TIER = (input: number): { q: number; tag: string } => {
  if (input === 0) return { q: 1, tag: "free" };
  if (input < 0.5) return { q: 4, tag: "budget" };
  if (input < 2) return { q: 7, tag: "mid" };
  if (input < 6) return { q: 10, tag: "premium" };
  return { q: 12, tag: "ultra-premium" };
};

function familyKey(g: GlobalModelLite): string {
  let n = g.name.toLowerCase();
  n = n.replace(/\([^)]*\)/g, " ");
  n = n.replace(/\b(free|via|github|groq|nvidia|cloudflare|cerebras|together|openrouter|pollinations|turbo|instruct|fp8|awq|latest|edition|beta|chat|fast|it|a\d+b|\d+e|\d{2,3}b|distill|venice|tput)\b/g, " ");
  n = n.replace(/[^a-z0-9.+ ]/g, " ").replace(/\s+/g, " ").trim();
  return `${g.vendor.toLowerCase()}|${n}`;
}

// Build a curated-benchmark lookup keyed by family via the existing CATALOG
// rows (which already key into CURATED_BENCHMARKS through getBenchmarks).
const CATALOG_BY_FAMILY = (() => {
  const map = new Map<string, { spec: ModelSpec; scores: BenchScores }>();
  for (const m of MODELS) {
    const { scores, estimated } = getBenchmarks(m);
    if (estimated) continue;
    const k = familyKey({ vendor: m.vendor, name: m.name } as GlobalModelLite);
    if (!map.has(k)) map.set(k, { spec: m, scores });
  }
  return map;
})();

export interface GlobalRow {
  model: GlobalModelLite;
  quality: number;
  speed: number;
  contextScore: number;
  openness: number;   // can't know upstream — proxied from pricing
  value: number;
  composite: number;
  bench: BenchScores;
  benchReported: boolean;
  tags: string[];
}

function contextScore(ctx: number): number {
  return clamp((Math.log(Math.max(1000, ctx) / 1000) / Math.log(2000)) * 100);
}

function deriveBenchmarks(quality: number, tags: string[]): BenchScores {
  const code = tags.includes("code") ? 6 : 0;
  const reason = tags.includes("reasoning") ? 5 : 0;
  const math = tags.includes("reasoning") ? 8 : 0;
  const small = tags.includes("tiny") ? 10 : 0;
  const vision = tags.includes("vision");
  const out: BenchScores = {
    mmluPro: clamp(quality - small * 0.4),
    gpqa: clamp((quality - 40) * 1.15 + reason - small * 1.4),
    humanEval: clamp(quality + code - small * 0.5),
    sweBench: clamp((quality - 45) * 1.25 + code * 1.4 - small * 1.6, 0, 78),
    math: clamp(quality + math - small * 0.6),
    arenaElo: clamp(1000 + (quality - 40) * 9 + reason * 2, 950, 1480),
  };
  if (vision) out.mmmu = clamp(quality * 0.86);
  return out;
}

export function computeGlobalRow(g: GlobalModelLite): GlobalRow {
  // 1. Quality from vendor prior + name signals + pricing + context.
  let quality = VENDOR_PRIOR[g.vendor] ?? 60;
  let speed = 70;
  const tags: string[] = [];
  const nameLow = g.name.toLowerCase();
  const lowerVendorName = `${g.vendor.toLowerCase()} ${nameLow}`;

  for (const s of SIGNALS) {
    if (!s.match.test(lowerVendorName)) continue;
    if (s.q) quality += s.q;
    if (s.speed) speed += s.speed;
    if (s.tags) tags.push(...s.tags);
  }
  if (g.modalities.includes("vision") && !tags.includes("vision")) tags.push("vision");

  const tier = PRICE_TIER(g.inputPrice);
  quality += tier.q;
  if (tier.tag === "free") tags.push("free");
  quality += CONTEXT_BONUS(g.context);

  quality = clamp(quality);
  speed = clamp(speed);

  // 2. Benchmarks: prefer curated family numbers, else derive.
  const curated = CATALOG_BY_FAMILY.get(familyKey(g));
  const bench: BenchScores = curated
    ? curated.scores
    : deriveBenchmarks(quality, tags);
  // Layer signal-driven boosts on top of derived (not curated).
  if (!curated) {
    for (const s of SIGNALS) {
      if (!s.match.test(lowerVendorName) || !s.bench) continue;
      for (const k of Object.keys(s.bench) as BenchKey[]) {
        const cur = bench[k];
        if (cur == null) continue;
        bench[k] = clamp(cur + (s.bench[k] ?? 0), 0, BENCHMARK_BY_KEY[k].max);
      }
    }
  }

  // 3. Composite — same weighting as catalog leaderboard.
  const ctxScore = contextScore(g.context);
  const openness = g.inputPrice === 0 ? 80 : g.inputPrice < 0.5 ? 60 : 35;
  const value = g.inputPrice === 0 ? 100 : g.inputPrice < 0.5 ? 72 : g.inputPrice < 2 ? 50 : 28;
  const composite = Math.round(
    quality * 0.35 + speed * 0.2 + ctxScore * 0.15 + openness * 0.15 + value * 0.15,
  );

  return {
    model: g,
    quality, speed, contextScore: ctxScore, openness, value, composite,
    bench, benchReported: !!curated,
    tags: Array.from(new Set(tags)),
  };
}

export function computeGlobalRows(globalModels: GlobalModelLite[]): GlobalRow[] {
  return globalModels.map(computeGlobalRow).sort((a, b) => b.composite - a.composite);
}

// ── Filters ─────────────────────────────────────────────────────────────────

export type GlobalFilter = "all" | "free" | "frontier" | "vision" | "code" | "reasoning" | "new" | "incatalog";

export const GLOBAL_FILTERS: { id: GlobalFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "frontier", label: "Frontier" },
  { id: "reasoning", label: "Reasoning" },
  { id: "code", label: "Code" },
  { id: "vision", label: "Vision" },
  { id: "new", label: "New (30d)" },
  { id: "incatalog", label: "In LLMAtlas" },
];

const NEW_CUTOFF_SECONDS = 30 * 86400;

export function matchesGlobal(r: GlobalRow, f: GlobalFilter): boolean {
  const g = r.model;
  switch (f) {
    case "all": return true;
    case "free": return g.inputPrice === 0;
    case "frontier": return r.quality >= 85;
    case "reasoning": return r.tags.includes("reasoning");
    case "code": return r.tags.includes("code");
    case "vision": return g.modalities.includes("vision");
    case "new": return g.created > 0 && Date.now() / 1000 - g.created < NEW_CUTOFF_SECONDS;
    case "incatalog": return g.inCatalog;
  }
}

// ── Vendor aggregates for the global view ───────────────────────────────────

export interface GlobalVendorAgg {
  vendor: string;
  count: number;
  freeCount: number;
  visionCount: number;
  avgQuality: number;
  best: GlobalRow;
}

export function aggregateGlobalVendors(rows: GlobalRow[]): GlobalVendorAgg[] {
  const map = new Map<string, GlobalRow[]>();
  for (const r of rows) {
    const arr = map.get(r.model.vendor) ?? [];
    arr.push(r);
    map.set(r.model.vendor, arr);
  }
  const out: GlobalVendorAgg[] = [];
  for (const [vendor, list] of map) {
    if (list.length === 0) continue;
    const best = list.reduce((a, b) => (b.composite > a.composite ? b : a));
    out.push({
      vendor,
      count: list.length,
      freeCount: list.filter((r) => r.model.inputPrice === 0).length,
      visionCount: list.filter((r) => r.model.modalities.includes("vision")).length,
      avgQuality: Math.round(list.reduce((s, r) => s + r.quality, 0) / list.length),
      best,
    });
  }
  return out.sort((a, b) => b.count - a.count || b.avgQuality - a.avgQuality);
}

// ── Bench detail for upcoming models (full BenchScores derivation) ──────────

export function projectUpcomingBenchmarks(
  expectedBenchmark: number | undefined,
  tags: string[],
  hasVision: boolean,
): BenchScores {
  const q = expectedBenchmark ?? 80;
  const code = tags.includes("code") || tags.includes("agentic") ? 6 : 0;
  const reason = tags.includes("reasoning") || tags.includes("thinking") ? 6 : 0;
  const math = tags.includes("math") || tags.includes("reasoning") ? 8 : 0;
  const out: BenchScores = {
    mmluPro: clamp(q),
    gpqa: clamp((q - 40) * 1.18 + reason),
    humanEval: clamp(q + code),
    sweBench: clamp((q - 45) * 1.3 + code * 1.4, 0, 85),
    math: clamp(q + math),
    arenaElo: clamp(1000 + (q - 40) * 9 + reason * 3, 950, 1500),
  };
  if (hasVision) out.mmmu = clamp(q * 0.88);
  return out;
}

export { BENCHMARKS, BENCHMARK_BY_KEY };

// ── Capability categories — top-N picks per real-world capability ────────────

export interface CapabilityCategory {
  id: string;
  label: string;
  short: string;
  description: string;
  /** lucide icon name, resolved client-side */
  iconKey: "Brain" | "Code2" | "Eye" | "Sigma" | "Maximize2" | "Bot" | "Gauge" | "Languages" | "Lock" | "Zap";
  /** Tailwind tint class used on the icon. */
  tint: string;
  /** rgb tint for headings/bars. */
  color: string;
  /** sort key — higher is better */
  rank: (r: GlobalRow) => number;
}

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    id: "reasoning", label: "Deep Reasoning", short: "Reasoning",
    description:
      "Chain-of-thought heavy models that excel at multi-step logic, science questions and complex inference. GPQA-Diamond and MATH dominate the ranking.",
    iconKey: "Brain", tint: "text-violet-500", color: "#8B5CF6",
    rank: (r) => (r.bench.gpqa ?? 0) * 1.2 + (r.bench.math ?? 0) * 1.0 + r.quality * 0.4,
  },
  {
    id: "coding", label: "Real-World Coding", short: "Coding",
    description:
      "Models tuned for software engineering — single-function generation (HumanEval) plus repo-scale agentic patches (SWE-bench Verified).",
    iconKey: "Code2", tint: "text-emerald-500", color: "#10B981",
    rank: (r) => (r.bench.humanEval ?? 0) * 1.0 + (r.bench.sweBench ?? 0) * 1.6 + r.quality * 0.3,
  },
  {
    id: "vision", label: "Multimodal Vision", short: "Vision",
    description:
      "Vision-language models capable of image understanding — image Q&A, OCR, diagram parsing. Scored on MMMU + general quality.",
    iconKey: "Eye", tint: "text-sky-500", color: "#0EA5E9",
    rank: (r) => r.model.modalities.includes("vision") ? (r.bench.mmmu ?? 60) * 1.5 + r.quality * 0.5 : -1,
  },
  {
    id: "math", label: "Pure Mathematics", short: "Math",
    description:
      "Competition mathematics (MATH-500 & AIME-style). Symbolic step-by-step reasoning models dominate this leaderboard.",
    iconKey: "Sigma", tint: "text-rose-500", color: "#F43F5E",
    rank: (r) => (r.bench.math ?? 0) * 2.0 + (r.bench.gpqa ?? 0) * 0.3,
  },
  {
    id: "longcontext", label: "Ultra-Long Context", short: "Context",
    description:
      "Models with 200K+ token windows — built for long documents, multi-file RAG, codebase-scale reasoning and book-length conversations.",
    iconKey: "Maximize2", tint: "text-amber-500", color: "#F59E0B",
    rank: (r) => r.model.context >= 200_000 ? r.contextScore * 1.2 + r.quality * 0.6 : -1,
  },
  {
    id: "agentic", label: "Agentic / Tool Use", short: "Agentic",
    description:
      "Models trained for autonomous tool use & multi-step plans — proxied by SWE-bench Verified (real GitHub PRs), agentic-tagged families.",
    iconKey: "Bot", tint: "text-fuchsia-500", color: "#D946EF",
    rank: (r) => (r.bench.sweBench ?? 0) * 1.6 + (r.tags.includes("reasoning") ? 8 : 0) + r.quality * 0.4,
  },
  {
    id: "value", label: "Best Value", short: "Value",
    description:
      "Maximum quality per dollar — frontier-grade models priced like commodity tiers, plus genuinely free APIs that hit ≥80 composite.",
    iconKey: "Gauge", tint: "text-cyan-500", color: "#06B6D4",
    rank: (r) => r.quality * (r.model.inputPrice === 0 ? 1.6 : r.model.inputPrice < 0.5 ? 1.2 : 0.6),
  },
  {
    id: "multilingual", label: "Multilingual", short: "Multilingual",
    description:
      "Strong cross-lingual quality — derived from broad-knowledge MMLU-Pro plus a vendor prior for the labs known for non-English coverage.",
    iconKey: "Languages", tint: "text-indigo-500", color: "#6366F1",
    rank: (r) => {
      const v = r.model.vendor;
      const bonus = ["Mistral", "Alibaba", "Cohere", "Google", "MiniMax", "DeepSeek", "ZAI"].includes(v) ? 12 : 0;
      return (r.bench.mmluPro ?? 0) * 1.1 + bonus + r.quality * 0.3;
    },
  },
  {
    id: "openweights", label: "Open Weights", short: "Open",
    description:
      "Models whose weights are publicly released — reproducible, auditable, self-hostable. Tier proxied by pricing & vendor convention (free OSS providers).",
    iconKey: "Lock", tint: "text-emerald-600", color: "#059669",
    rank: (r) => {
      const open = r.model.inputPrice === 0 && ["Meta", "DeepSeek", "Alibaba", "Mistral", "Nvidia", "Microsoft", "OpenAI"].includes(r.model.vendor);
      return open ? r.quality * 1.4 : -1;
    },
  },
  {
    id: "fastest", label: "Speed & Edge", short: "Fast",
    description:
      "Small + fast models built for high-throughput, edge & on-device deployment. Speed-quality Pareto front, with a hard small-context filter avoided.",
    iconKey: "Zap", tint: "text-orange-500", color: "#F97316",
    rank: (r) => r.speed * 1.4 + r.quality * 0.5 - (r.model.context < 16_000 ? 20 : 0),
  },
];

export function topInCategory(rows: GlobalRow[], cat: CapabilityCategory, n = 5): GlobalRow[] {
  return rows
    .map((r) => ({ r, s: cat.rank(r) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.r);
}
