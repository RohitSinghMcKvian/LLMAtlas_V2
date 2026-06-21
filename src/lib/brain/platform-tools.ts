"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — platform tool pack (Phase 5 → multi-agent upgrade)
//
// The tool surface for the GLOBAL Atlas Agent (the brand-mark command bar that
// spans Learn / Research / Develop). Unlike the /code pack (file ops, shell),
// these tools drive the *platform itself*: navigate pages, search/inspect the
// model catalog, preload a comparison, open the playground to chat with a model,
// estimate costs, open lessons, save prompts, change the default model + theme,
// and the SAME memory tools as /code — so what the agent learns anywhere is
// recalled everywhere.
//
// For complex, multi-part requests the lead agent can call `delegate`, which
// fans the work out to read-only sub-agents (each its own headless loop) running
// in parallel, then synthesises their findings. That's the "deploy agents &
// sub-agents depending on task complexity" behaviour.
//
// Read-only / navigation tools auto-run (the expected UX for a command bar the
// user is actively driving). Mutations here are in-app personalisation only
// (default model, theme, saved prompts) — never anything security-sensitive.
// ─────────────────────────────────────────────────────────────────────────────

import { MODELS, findModel } from "@/lib/models";
import { LEVELS } from "@/lib/curriculum";
import { useSettingsStore, usePromptStore } from "@/lib/store";
import { recall as memRecall, remember as memRemember, MEMORY_TYPES, type MemoryType } from "@/lib/brain/memory";
import { agentToolsAsNative } from "@/lib/brain/prompt";
import { UCL_BASE_PRIMER } from "@/lib/ucl";
import type { ToolDefinition, ToolCall, ToolResult } from "@/lib/code/tools";

// A delegated unit of work and the sub-agent's reported result. Defined here
// (not in the orchestrator) so platform-tools has no dependency on the loop —
// the orchestrator imports these back.
export interface SubTask { role: string; task: string; }
export interface SubResult { role: string; task: string; ok: boolean; summary: string; toolCount: number; }

// Friendly page name → route. Keep in sync with the dashboard nav.
export const PAGES: Record<string, string> = {
  overview: "/dashboard",
  dashboard: "/dashboard",
  playground: "/playground",
  chat: "/playground",
  code: "/code",
  projects: "/projects",
  compare: "/compare",
  prompts: "/prompts",
  models: "/models",
  leaderboard: "/leaderboard",
  calculator: "/calculator",
  "cost calculator": "/calculator",
  status: "/status",
  learn: "/learn",
  settings: "/settings",
};

const pageList = Object.keys(PAGES).filter((p, i, a) => a.indexOf(p) === i).join(", ");

// ── Read-only tools (safe for sub-agents + lead) ─────────────────────────────
const READONLY_TOOLS: ToolDefinition[] = [
  {
    name: "find_models",
    description:
      "Search the LLMAtlas model catalog by name/vendor and filters, returning specs (context, price per 1M tokens, benchmark, speed, modalities). Use for questions like 'cheapest vision model' or 'fastest free model'.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or vendor substring (optional)." },
        freeOnly: { type: "boolean", description: "Only free-tier models." },
        vision: { type: "boolean", description: "Only models with vision." },
        sortBy: { type: "string", enum: ["benchmark", "price", "speed"], description: "Ranking (default benchmark)." },
        limit: { type: "number", description: "Max results (default 8)." },
      },
    },
  },
  {
    name: "model_details",
    description: "Get the full spec + description of one model by its id (from find_models).",
    parameters: {
      type: "object",
      properties: { modelId: { type: "string", description: "Model id." } },
      required: ["modelId"],
    },
  },
  {
    name: "estimate_cost",
    description: "Estimate the USD cost of running a model for a given token volume. Free-tier models return $0.",
    parameters: {
      type: "object",
      properties: {
        modelId: { type: "string", description: "Model id (from find_models)." },
        inputTokens: { type: "number", description: "Prompt tokens per call." },
        outputTokens: { type: "number", description: "Completion tokens per call." },
        calls: { type: "number", description: "Number of calls (default 1)." },
      },
      required: ["modelId"],
    },
  },
  {
    name: "search_learn",
    description:
      "Search the LLMAtlas learning curriculum (5 levels, 25 chapters on LLMs/prompting/RAG/agents/production) and return matching lessons with links.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic to search for." },
        limit: { type: "number", description: "Max lessons (default 5)." },
      },
      required: ["query"],
    },
  },
  {
    name: "quiz_topic",
    description:
      "Pull multiple-choice quiz questions from the curriculum for a topic. Use to TEST the user's understanding after a lesson. Returns question, options, the correct index, and a one-line explanation per item — present each question, wait for the user's answer, then reveal whether it was correct and explain.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic to quiz on (e.g. 'transformers', 'RAG', 'prompt injection')." },
        limit: { type: "number", description: "Max questions (default 3, hard cap 8)." },
      },
      required: ["query"],
    },
  },
  {
    name: "recommend_model",
    description:
      "Cost-aware routing: pick the CHEAPEST model that still meets a quality bar for a task. Filters by required modality + minimum benchmark, then ranks by (input+output price) / benchmark — best $-per-quality wins. Use when the user wants the cheapest option that's good enough, or when planning high-volume runs.",
    parameters: {
      type: "object",
      properties: {
        task: { type: "string", description: "One-line description of the task (for context in the answer)." },
        minBenchmark: { type: "number", description: "Minimum composite benchmark 0-100 (default 60 — solid mid-tier)." },
        modality: { type: "string", enum: ["text", "vision", "code"], description: "Required modality (default text)." },
        preferFree: { type: "boolean", description: "Prefer free-tier models when they meet the bar (default true)." },
        openSourceOnly: { type: "boolean", description: "Only open-source models (default false)." },
        limit: { type: "number", description: "Max picks (default 3)." },
      },
    },
  },
  {
    name: "recall",
    description: "Retrieve relevant memories from previous sessions (preferences, facts, past tasks, skills).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to remember about." },
        k: { type: "number", description: "Max results (default 5)." },
      },
      required: ["query"],
    },
  },
];

// ── Action / navigation tools (lead agent only) ──────────────────────────────
const ACTION_TOOLS: ToolDefinition[] = [
  {
    name: "navigate",
    description: `Navigate the user to a page in LLMAtlas. Valid pages: ${pageList}.`,
    parameters: {
      type: "object",
      properties: { page: { type: "string", description: "Destination page name." } },
      required: ["page"],
    },
  },
  {
    name: "compare_models",
    description:
      "Open the Compare page preloaded with 2–3 models side-by-side (optionally with a prompt). Use when the user wants to compare model outputs.",
    parameters: {
      type: "object",
      properties: {
        models: { type: "array", items: { type: "string" }, description: "2–3 model ids (from find_models)." },
        prompt: { type: "string", description: "Optional prompt to preload." },
      },
      required: ["models"],
    },
  },
  {
    name: "open_playground",
    description:
      "Open the Playground to chat with a model. Optionally preselect a model and queue a first prompt (set send=true to auto-send it).",
    parameters: {
      type: "object",
      properties: {
        model: { type: "string", description: "Model id to preselect (optional)." },
        prompt: { type: "string", description: "First prompt to queue in the composer (optional)." },
        send: { type: "boolean", description: "Auto-send the queued prompt (default false)." },
      },
    },
  },
  {
    name: "open_lesson",
    description: "Open the single best-matching learning lesson for a topic (navigates directly to it).",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Topic to open a lesson for." } },
      required: ["query"],
    },
  },
  {
    name: "save_prompt",
    description: "Save a reusable prompt to the user's Prompt Library.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title (optional — derived from content if omitted)." },
        content: { type: "string", description: "The prompt text." },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags." },
      },
      required: ["content"],
    },
  },
  {
    name: "set_default_model",
    description: "Set the user's default model across the platform (Playground, Atlas).",
    parameters: {
      type: "object",
      properties: { modelId: { type: "string", description: "Model id (from find_models)." } },
      required: ["modelId"],
    },
  },
  {
    name: "set_theme",
    description: "Switch the app appearance.",
    parameters: {
      type: "object",
      properties: { theme: { type: "string", enum: ["light", "dark", "system"], description: "Theme." } },
      required: ["theme"],
    },
  },
  {
    name: "remember",
    description: "Save a durable memory (user preference, fact, task, or skill) for future sessions.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The thing to remember, in one sentence." },
        type: { type: "string", enum: MEMORY_TYPES, description: "Category (default fact)." },
      },
      required: ["text"],
    },
  },
  {
    name: "delegate",
    description:
      "For a COMPLEX, multi-part request, fan the work out to 2–4 parallel read-only sub-agents. Each subtask is researched independently and reported back, then YOU synthesise the final answer. Use this when a request needs several independent investigations (e.g. 'research the 3 best free coding models and recommend one'). Do NOT use it for simple single-step requests.",
    parameters: {
      type: "object",
      properties: {
        subtasks: {
          type: "array",
          description: "2–4 independent subtasks.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", description: "Sub-agent role, e.g. researcher, analyst, scout." },
              task: { type: "string", description: "The self-contained subtask to investigate." },
            },
            required: ["task"],
          },
        },
      },
      required: ["subtasks"],
    },
  },
];

/** Full lead-agent tool pack. */
export const PLATFORM_TOOLS: ToolDefinition[] = [...ACTION_TOOLS, ...READONLY_TOOLS];

/** Restricted pack handed to delegated sub-agents (read-only, no recursion). */
export const SUBAGENT_TOOLS: ToolDefinition[] = READONLY_TOOLS;

export const ATLAS_SYSTEM = `You are Atlas, the AI agent for the LLMAtlas platform — an open-source-first workspace for learning about, researching, and building with LLMs. You can operate the ENTIRE app on the user's behalf: find, inspect and compare models, open the Playground to chat with a model, estimate costs, navigate anywhere, open lessons, save prompts, change the default model and theme, and remember preferences.

Choose your approach by task complexity:
• Simple request (one fact or one action) → call a single direct tool, then answer.
• Complex, multi-part request that needs several independent investigations → break it into 2–4 self-contained subtasks and call delegate ONCE. Sub-agents research in parallel and report back. After the delegate result returns, you MUST write a final plain-prose answer that synthesises their findings into one clear recommendation (no tool call, no JSON). Never delegate trivial work.

Be concise and action-oriented: when the user asks to go somewhere or do something, use a tool rather than describing how. When you learn a durable user preference, call remember; use recall to personalise. After acting, confirm in one short sentence.`;

const SUBAGENT_SYSTEM = `You are a focused Atlas sub-agent handling ONE delegated subtask. Call a read-only tool to fetch REAL data, wait for the tool result, then report a tight summary (2–4 sentences or a short list) answering exactly the subtask. NEVER invent tool output or write fake JSON results — only use data returned by the tools. Do not chat or ask questions. Your final message is plain prose (no JSON, no tool call).`;

function toolSignature(t: ToolDefinition): string {
  const props = (t.parameters as { properties?: Record<string, unknown> }).properties ?? {};
  return `- ${t.name}(${Object.keys(props).join(", ")}) — ${t.description}`;
}

/** Build the lead agent's system prompt (lists tools for text-protocol models). */
export function buildAtlasSystemPrompt(useNativeTools: boolean, memoryContext?: string, skillInstructions?: string): string {
  const toolSection = useNativeTools
    ? "Call tools using the native function-calling API. Call ONE tool per message and wait for the result."
    : `You have access to these tools:\n${PLATFORM_TOOLS.map(toolSignature).join("\n")}\n\nTo call a tool, output EXACTLY ONE JSON block and then stop:\n\n\`\`\`tool\n{"name": "delegate", "args": {"subtasks": [{"role": "researcher", "task": "..."}, {"role": "analyst", "task": "..."}]}}\n\`\`\`\n\nCall ONE tool per message; after the result, decide the next step.`;
  const skill = skillInstructions?.trim() ? `\n\n${skillInstructions.trim()}` : "";
  const mem = memoryContext?.trim() ? `\n\n${memoryContext.trim()}` : "";
  // Atlas inherits the same UCL persona Playground/Compare get, so any answer it
  // surfaces (or hands off to a sub-agent) is held to the same quality bar.
  return `${ATLAS_SYSTEM}\n\n${UCL_BASE_PRIMER}${skill}\n\n${toolSection}${mem}\n\nWhen the request is satisfied, reply with a short answer and NO tool call.`;
}

/** Build a sub-agent's system prompt for a given role. */
export function buildSubagentPrompt(role: string, useNativeTools: boolean): string {
  const toolSection = useNativeTools
    ? "Call tools via the native function-calling API, one per message."
    : `Tools:\n${SUBAGENT_TOOLS.map(toolSignature).join("\n")}\n\nTo call a tool, output one JSON block:\n\`\`\`tool\n{"name":"find_models","args":{"freeOnly":true}}\n\`\`\``;
  return `${SUBAGENT_SYSTEM}\n\nYour role: ${role || "researcher"}.\n\n${toolSection}\n\nWhen done, give the result with NO tool call.`;
}

export const atlasToolsAsNative = () => agentToolsAsNative(PLATFORM_TOOLS);

interface ExecutorCtx {
  /** Navigate the SPA (router.push). */
  navigate: (route: string) => void;
  /** Preload the compare page selection. */
  setCompare: (models: string[], prompt?: string) => void;
  /** Switch theme (next-themes setTheme). */
  setTheme?: (theme: string) => void;
  /** Fan a complex task out to parallel sub-agents (wired by the bar). */
  delegate?: (subtasks: SubTask[]) => Promise<SubResult[]>;
}

function modelBrief(id: string) {
  const m = findModel(id);
  if (!m) return null;
  return {
    id: m.id, name: m.name, vendor: m.vendor, context: m.context,
    inputPerM: m.inputPrice, outputPerM: m.outputPrice, free: m.free,
    benchmark: m.benchmark, speed: m.speedScore, modalities: m.modalities,
  };
}

/**
 * Execute a READ-ONLY tool. Shared by the lead executor (fall-through) and the
 * sub-agent executor. Pure — no router, no store mutations.
 */
export async function executeReadonlyTool(call: ToolCall): Promise<ToolResult> {
  const a = call.args ?? {};
  switch (call.name) {
    case "find_models": {
      const q = String(a.query ?? "").trim().toLowerCase();
      const sortBy = (a.sortBy as string) ?? "benchmark";
      let list = MODELS.filter((m) => !m.disabled);
      if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || m.vendor.toLowerCase().includes(q));
      if (a.freeOnly) list = list.filter((m) => m.free);
      if (a.vision) list = list.filter((m) => m.modalities.includes("vision"));
      list = list.sort((m1, m2) => {
        if (sortBy === "price") return (m1.inputPrice + m1.outputPrice) - (m2.inputPrice + m2.outputPrice);
        if (sortBy === "speed") return (m2.speedScore ?? 0) - (m1.speedScore ?? 0);
        return (m2.benchmark ?? 0) - (m1.benchmark ?? 0);
      });
      const limit = typeof a.limit === "number" ? Math.max(1, Math.min(20, a.limit)) : 8;
      return { ok: true, output: list.slice(0, limit).map((m) => modelBrief(m.id)) };
    }
    case "model_details": {
      const m = findModel(String(a.modelId ?? a.model ?? ""));
      if (!m) return { ok: false, error: "unknown modelId (use find_models to get ids)" };
      return {
        ok: true,
        output: {
          id: m.id, name: m.name, vendor: m.vendor, provider: m.provider, context: m.context,
          inputPerM: m.inputPrice, outputPerM: m.outputPrice, free: m.free, openSource: m.openSource,
          modalities: m.modalities, released: m.released, benchmark: m.benchmark, speed: m.speedScore,
          description: m.description, tags: m.tags,
        },
      };
    }
    case "estimate_cost": {
      const m = findModel(String(a.modelId ?? ""));
      if (!m) return { ok: false, error: "unknown modelId (use find_models)" };
      const inTok = Math.max(0, Number(a.inputTokens ?? 0));
      const outTok = Math.max(0, Number(a.outputTokens ?? 0));
      const calls = Math.max(1, Number(a.calls ?? 1));
      const cost = ((inTok / 1e6) * m.inputPrice + (outTok / 1e6) * m.outputPrice) * calls;
      return {
        ok: true,
        output: {
          model: m.name, free: m.free, calls, inputTokens: inTok, outputTokens: outTok,
          estCostUSD: Number(cost.toFixed(6)), note: m.free ? "free tier — $0" : undefined,
        },
      };
    }
    case "search_learn": {
      const q = String(a.query ?? "").trim().toLowerCase();
      if (!q) return { ok: false, error: "query is required" };
      const hits: Array<{ title: string; level: string; href: string; minutes: number; summary: string }> = [];
      for (const level of LEVELS) {
        for (const ch of level.chapters) {
          const hay = `${ch.title} ${ch.summary} ${level.keyTopics.join(" ")}`.toLowerCase();
          if (hay.includes(q)) {
            hits.push({ title: ch.title, level: level.title, href: `/learn/level/${level.slug}/${ch.slug}`, minutes: ch.minutes, summary: ch.summary });
          }
        }
      }
      const limit = typeof a.limit === "number" ? Math.max(1, Math.min(15, a.limit)) : 5;
      return { ok: true, output: hits.slice(0, limit) };
    }
    case "quiz_topic": {
      const q = String(a.query ?? "").trim().toLowerCase();
      if (!q) return { ok: false, error: "query is required" };
      const pool: Array<{
        chapter: string; level: string; href: string;
        question: string; options: string[]; correctIndex: number; explanation: string;
      }> = [];
      for (const level of LEVELS) {
        for (const ch of level.chapters) {
          const hay = `${ch.title} ${ch.summary} ${level.keyTopics.join(" ")}`.toLowerCase();
          if (!hay.includes(q)) continue;
          for (const qz of ch.quiz) {
            pool.push({
              chapter: ch.title, level: level.title,
              href: `/learn/level/${level.slug}/${ch.slug}`,
              question: qz.question, options: qz.options,
              correctIndex: qz.correctIndex, explanation: qz.explanation,
            });
          }
        }
      }
      if (pool.length === 0) return { ok: true, output: "(no quiz questions for that topic — try search_learn first)" };
      // Fisher-Yates shuffle so each call returns a fresh sample.
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const limit = typeof a.limit === "number" ? Math.max(1, Math.min(8, a.limit)) : 3;
      return { ok: true, output: pool.slice(0, limit) };
    }
    case "recommend_model": {
      const modality = (["text", "vision", "code"] as const).includes(a.modality as "text" | "vision" | "code")
        ? (a.modality as "text" | "vision" | "code") : "text";
      const minBench = typeof a.minBenchmark === "number" ? Math.max(0, Math.min(100, a.minBenchmark)) : 60;
      const preferFree = a.preferFree !== false; // default true
      const openOnly = a.openSourceOnly === true;
      const limit = typeof a.limit === "number" ? Math.max(1, Math.min(8, a.limit)) : 3;

      let pool = MODELS.filter((m) => !m.disabled && m.modalities.includes(modality));
      pool = pool.filter((m) => (m.benchmark ?? 0) >= minBench);
      if (openOnly) pool = pool.filter((m) => m.openSource);

      // Score: lower is better. Free + meets bar → 0 (always wins when preferFree).
      // Otherwise: average $ per 1M tokens, normalised by benchmark/100.
      const score = (m: typeof pool[number]) => {
        if (preferFree && m.free) return 0;
        const price = (m.inputPrice + m.outputPrice) / 2;
        const quality = Math.max(1, m.benchmark ?? 50) / 100;
        return price / quality;
      };
      pool.sort((a1, b1) => score(a1) - score(b1));

      if (pool.length === 0) {
        return {
          ok: true,
          output: `(no model meets minBenchmark=${minBench} for modality=${modality}${openOnly ? ", open-source only" : ""} — try lowering minBenchmark)`,
        };
      }

      const picks = pool.slice(0, limit).map((m) => ({
        id: m.id, name: m.name, vendor: m.vendor,
        free: m.free, openSource: m.openSource,
        inputPerM: m.inputPrice, outputPerM: m.outputPrice,
        benchmark: m.benchmark, speed: m.speedScore,
        costPerQuality: Number(score(m).toFixed(6)),
        reason: m.free
          ? "free tier, meets quality bar"
          : `$${((m.inputPrice + m.outputPrice) / 2).toFixed(3)}/M avg · benchmark ${m.benchmark ?? "?"}`,
      }));
      return { ok: true, output: { task: a.task ?? null, criteria: { modality, minBenchmark: minBench, preferFree, openSourceOnly: openOnly }, picks } };
    }
    case "recall": {
      const query = String(a.query ?? "").trim();
      if (!query) return { ok: false, error: "query is required" };
      const k = typeof a.k === "number" ? a.k : 5;
      const hits = await memRecall(query, k);
      return { ok: true, output: hits.length ? hits.map((h) => ({ type: h.memory.type, text: h.memory.text, score: Number(h.score.toFixed(3)) })) : "(no relevant memories)" };
    }
    default:
      return { ok: false, error: `unknown read-only tool: ${call.name}` };
  }
}

/** Build the lead platform-tool executor bound to a router + compare/theme/delegate hooks. */
export function makePlatformExecutor(ctx: ExecutorCtx) {
  return async function execute(call: ToolCall): Promise<ToolResult> {
    const a = call.args ?? {};
    try {
      switch (call.name) {
        case "navigate": {
          const key = String(a.page ?? "").trim().toLowerCase();
          const route = PAGES[key];
          if (!route) return { ok: false, error: `unknown page "${a.page}". Valid: ${pageList}` };
          ctx.navigate(route);
          return { ok: true, output: `navigated to ${route}` };
        }
        case "compare_models": {
          const ids = (Array.isArray(a.models) ? a.models : []).map(String).filter((id) => findModel(id));
          if (ids.length < 2) return { ok: false, error: "provide at least 2 valid model ids (use find_models to get ids)" };
          ctx.setCompare(ids.slice(0, 3), typeof a.prompt === "string" ? a.prompt : undefined);
          ctx.navigate("/compare");
          return { ok: true, output: `comparing ${ids.slice(0, 3).join(", ")} on /compare` };
        }
        case "open_playground": {
          const params = new URLSearchParams();
          const mid = String(a.model ?? "").trim();
          if (mid && findModel(mid)) params.set("model", mid);
          const q = String(a.prompt ?? "").trim();
          if (q) params.set("q", q.slice(0, 2000));
          if (a.send && q) params.set("send", "1");
          const qs = params.toString();
          ctx.navigate(`/playground${qs ? `?${qs}` : ""}`);
          return { ok: true, output: `opened playground${mid && findModel(mid) ? ` with ${findModel(mid)!.name}` : ""}${q ? ", prompt queued" : ""}` };
        }
        case "open_lesson": {
          const q = String(a.query ?? "").trim().toLowerCase();
          if (!q) return { ok: false, error: "query is required" };
          for (const level of LEVELS) {
            for (const ch of level.chapters) {
              const hay = `${ch.title} ${ch.summary} ${level.keyTopics.join(" ")}`.toLowerCase();
              if (hay.includes(q)) {
                ctx.navigate(`/learn/level/${level.slug}/${ch.slug}`);
                return { ok: true, output: `opened lesson "${ch.title}" (${level.title})` };
              }
            }
          }
          return { ok: false, error: "no matching lesson — try search_learn first" };
        }
        case "save_prompt": {
          const content = String(a.content ?? "").trim();
          if (!content) return { ok: false, error: "content is required" };
          const title = String(a.title ?? "").trim() || content.slice(0, 50) + (content.length > 50 ? "…" : "");
          const tags = Array.isArray(a.tags) ? a.tags.map(String).slice(0, 6) : [];
          const p = usePromptStore.getState().save({ title, content, tags: ["atlas", ...tags] });
          return { ok: true, output: `saved prompt "${p.title}" to the Prompt Library` };
        }
        case "set_default_model": {
          const m = findModel(String(a.modelId ?? ""));
          if (!m) return { ok: false, error: "unknown modelId (use find_models)" };
          useSettingsStore.getState().setDefaultModel(m.id);
          return { ok: true, output: `default model set to ${m.name}` };
        }
        case "set_theme": {
          const t = String(a.theme ?? "").toLowerCase();
          if (!["light", "dark", "system"].includes(t)) return { ok: false, error: "theme must be light, dark, or system" };
          if (!ctx.setTheme) return { ok: false, error: "theme control unavailable" };
          ctx.setTheme(t);
          return { ok: true, output: `theme set to ${t}` };
        }
        case "remember": {
          const text = String(a.text ?? "").trim();
          if (!text) return { ok: false, error: "text is required" };
          const type = (MEMORY_TYPES as string[]).includes(String(a.type)) ? (a.type as MemoryType) : "fact";
          const { memory, deduped } = await memRemember({ text, type });
          return { ok: true, output: `${deduped ? "updated" : "remembered"} ${memory.type}: "${memory.text}"` };
        }
        case "delegate": {
          if (!ctx.delegate) return { ok: false, error: "delegation unavailable" };
          const raw = Array.isArray(a.subtasks) ? a.subtasks : [];
          const subtasks: SubTask[] = raw
            .map((s) => {
              const o = (s ?? {}) as Record<string, unknown>;
              return { role: String(o.role ?? "researcher").slice(0, 40), task: String(o.task ?? "").trim() };
            })
            .filter((s) => s.task)
            .slice(0, 4);
          if (subtasks.length === 0) return { ok: false, error: "provide subtasks: [{role, task}, …]" };
          const results = await ctx.delegate(subtasks);
          return {
            ok: true,
            output: results.map((r) => ({ role: r.role, task: r.task, ok: r.ok, result: r.summary })),
          };
        }
        default:
          // Fall through to the shared read-only handlers.
          return await executeReadonlyTool(call);
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "platform tool failed" };
    }
  };
}
