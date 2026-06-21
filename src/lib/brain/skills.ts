"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — Skills system (Phase 6)
//
// A "skill" is a reusable, named bundle of behaviour: a description, a block of
// instructions injected into the agent's system prompt, and trigger keywords the
// agent uses to auto-select the right skill for a request. Ships curated
// built-in skills (Model Scout, Cost Optimizer, Learning Coach, Deep Researcher)
// and lets the user author their own. The active skill (pinned or auto-picked)
// shapes how Atlas approaches the task — Hermes/Claude-style "skills".
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export interface SkillDef {
  id: string;
  name: string;
  /** One-line summary shown in the picker. */
  description: string;
  /** Injected into the system prompt when this skill is active. */
  instructions: string;
  /** Keywords used to auto-select this skill for a request. */
  triggers: string[];
  builtin?: boolean;
  createdAt: number;
}

export const BUILTIN_SKILLS: SkillDef[] = [
  {
    id: "builtin-scout",
    name: "Model Scout",
    description: "Finds and recommends the right model for a use case.",
    instructions:
      "Act as a model-selection expert. For 'recommend the best/cheapest model for X', call recommend_model first (cost-aware ranking by $-per-quality with a benchmark floor), then optionally cross-check 2-3 picks with model_details. End with ONE clear pick and a one-line reason. Prefer free/open models unless the user needs frontier quality.",
    triggers: ["model", "cheapest", "fastest", "best model", "recommend", "which model", "vision", "coding model", "free model", "pick a model"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-cost",
    name: "Cost Optimizer",
    description: "Minimizes spend — estimates and compares token cost.",
    instructions:
      "Act as a cost-optimization analyst. For 'cheapest model good enough for X', call recommend_model with a sensible minBenchmark (60 default, 75+ if the task needs strong reasoning); then call estimate_cost to project monthly/per-run spend at the user's token volume. Always surface free-tier options that clear the bar before any paid one. Show the math.",
    triggers: ["cost", "price", "cheap", "budget", "expensive", "spend", "tokens", "estimate", "$", "per million"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-coach",
    name: "Learning Coach",
    description: "Guides you through the LLM curriculum.",
    instructions:
      "Act as a patient LLM tutor. Ground answers in the LLMAtlas curriculum with search_learn/open_lesson, link the exact lesson, and suggest a logical next chapter. Explain each concept simply with one concrete example. When the user asks to be tested, quizzed, or to check their understanding, call quiz_topic — then present ONE question at a time (just the question + options, never reveal the answer up front), wait for their reply, and confirm correctness + the one-line explanation afterwards.",
    triggers: ["learn", "explain", "what is", "how does", "tutorial", "lesson", "rag", "prompting", "agents", "fine-tune", "teach", "understand", "quiz", "test me", "questions"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-research",
    name: "Deep Researcher",
    description: "Splits hard questions across parallel sub-agents.",
    instructions:
      "For any multi-part or comparative question, decompose it into 2–4 independent subtasks and call delegate to research them in parallel, then synthesise ONE clear, well-structured recommendation that cites what each sub-agent found.",
    triggers: ["research", "compare", "analyze", "investigate", "pros and cons", "deep dive", "recommend the best", " vs ", "trade-off", "evaluate"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-slides",
    name: "Presentation Maker",
    description: "Builds a polished slide deck the user can present.",
    instructions:
      "Produce a complete slide deck as an HTML artifact (Tailwind preloaded). Single 16:9 viewport per slide, ArrowLeft/Right + Space navigation, dot-pager, hidden speaker notes (N key), gradient backdrop, readable typography (text-4xl headings). 8–12 slides typical: title, agenda, content, closing. Real content. Then open_playground if the user wants to iterate.",
    triggers: ["slide", "deck", "presentation", "pitch deck", "keynote", "powerpoint", "pptx", "pitch"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-docauthor",
    name: "Document Author",
    description: "Writes polished long-form documents — reports, memos, proposals.",
    instructions:
      "Emit a markdown artifact with title, subtitle, TOC, numbered sections, GFM tables, KaTeX math, mermaid diagrams where useful, and a sources/appendix if cited. No 'TODO' placeholders — write the real content.",
    triggers: ["document", "report", "memo", "proposal", "letter", "essay", "whitepaper", "docx", "word doc", "policy"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-appbuilder",
    name: "App Builder",
    description: "Ships a working interactive app in one artifact.",
    instructions:
      "Build a complete, polished interactive app as a React artifact (default-export App). Realistic sample data, full CRUD where relevant, keyboard shortcuts, empty/loading/error states, mobile-responsive, dark-mode aware. Use lucide-react, recharts, framer-motion, clsx, date-fns as needed. Quality bar: top-tier product page.",
    triggers: ["build me an app", "build a tool", "interactive", "dashboard", "calculator", "ui for", "build me a page", "build me a component", "make a website", "build a website"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-gamestudio",
    name: "Game Studio",
    description: "Builds a playable browser game in one artifact.",
    instructions:
      "Produce a complete playable HTML game with <canvas>, requestAnimationFrame loop, keyboard + touch controls, score, high-score (localStorage), pause, restart, win/lose screens, WebAudio chiptune SFX, and on-screen instructions. Increasing difficulty, juice on score (shake/particles).",
    triggers: ["game", "playable", "snake", "pong", "tetris", "platformer", "arcade", "puzzle game", "build me a game"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-pdfauthor",
    name: "PDF Author",
    description: "Generates real PDF documents — invoices, reports, resumes, certificates.",
    instructions:
      "Emit a ```pdf fence with polished markdown (auto-renders to a real PDF via html2pdf). For precise layout (drawn shapes, autotables, page breaks) use a jsPDF snippet ending with __send(doc.output('blob')). jspdf-autotable preloaded. Real content, sensible margins, page numbers on multi-page docs.",
    triggers: ["pdf", "invoice", "resume", "cv", "certificate", "letterhead", "contract", "brochure", "ebook", "agreement"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-chartstudio",
    name: "Chart Studio",
    description: "Production-grade interactive charts — bar, line, scatter, heatmap.",
    instructions:
      "Emit a ```chart fence with a Chart.js v4 config (default) OR Vega-Lite spec OR Plotly figure (auto-detected). Pick chart type fitting the data, label axes/units, use a tasteful palette, real numbers. One sentence interpretation before the artifact.",
    triggers: ["chart", "graph", "plot", "histogram", "scatter", "bar chart", "line chart", "pie chart", "heatmap", "visualize", "data viz"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-3d",
    name: "3D Designer",
    description: "Interactive Three.js scenes — models, animations, shaders.",
    instructions:
      "Emit a ```three fence with Three.js code. THREE, scene, camera, renderer, controls, basic lights preloaded. Add objects to scene; define window.update = (t) => {...} for animation. MeshStandardMaterial, soft lighting, calm motion.",
    triggers: ["3d", "three.js", "threejs", "webgl", "3d scene", "globe", "voxel", "shader", "raymarching"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-audiocomposer",
    name: "Audio Composer",
    description: "Generative music & sound effects with Tone.js.",
    instructions:
      "Emit a ```audio fence with a Tone.js snippet. Renderer shows Play/Stop + waveform. Pick key/tempo/progression, use Tone.Synth/Sequence/Transport, call window.__onStop(fn) for cleanup. Variation every 4-8 bars; tasteful reverb.",
    triggers: ["music", "audio", "sound", "song", "melody", "beat", "rhythm", "synth", "ambient", "compose"],
    builtin: true, createdAt: 0,
  },
  {
    id: "builtin-mapmaker",
    name: "Map Maker",
    description: "Interactive maps with markers, polygons, GeoJSON layers.",
    instructions:
      "Emit a ```map fence with EITHER a GeoJSON FeatureCollection (auto-styled, popup-on-click) OR a Leaflet snippet (L + OSM map preloaded). Real lng/lat. Caption the map.",
    triggers: ["map", "geo", "geojson", "leaflet", "marker", "location", "route", "country", "city"],
    builtin: true, createdAt: 0,
  },
];

interface SkillStore {
  /** User-authored skills (built-ins are merged at read time). */
  skills: SkillDef[];
  /** Pinned skill id, or null to auto-select per request. */
  activeId: string | null;
  /** When true and no skill is pinned, pick the best skill per request. */
  autoSelect: boolean;
  add: (input: { name: string; description: string; instructions: string; triggers: string[] }) => SkillDef;
  update: (id: string, patch: Partial<Omit<SkillDef, "id" | "builtin" | "createdAt">>) => void;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;
  setAutoSelect: (v: boolean) => void;
}

export const useSkillStore = create<SkillStore>()(
  persist(
    (set) => ({
      skills: [],
      activeId: null,
      autoSelect: true,
      add: ({ name, description, instructions, triggers }) => {
        const s: SkillDef = {
          id: nanoid(8),
          name: name.trim() || "Untitled skill",
          description: description.trim(),
          instructions: instructions.trim(),
          triggers: triggers.map((t) => t.trim().toLowerCase()).filter(Boolean),
          createdAt: Date.now(),
        };
        set((st) => ({ skills: [s, ...st.skills] }));
        return s;
      },
      update: (id, patch) =>
        set((st) => ({
          skills: st.skills.map((s) =>
            s.id === id
              ? { ...s, ...patch, triggers: patch.triggers ? patch.triggers.map((t) => t.toLowerCase()) : s.triggers }
              : s,
          ),
        })),
      remove: (id) =>
        set((st) => ({ skills: st.skills.filter((s) => s.id !== id), activeId: st.activeId === id ? null : st.activeId })),
      setActive: (id) => set({ activeId: id }),
      setAutoSelect: (v) => set({ autoSelect: v }),
    }),
    { name: "llmatlas-skills", storage: createJSONStorage(() => localStorage) },
  ),
);

/** Built-ins first, then user skills. */
export function allSkills(userSkills: SkillDef[]): SkillDef[] {
  return [...BUILTIN_SKILLS, ...userSkills];
}

export function getSkill(id: string | null, userSkills: SkillDef[]): SkillDef | null {
  if (!id) return null;
  return allSkills(userSkills).find((s) => s.id === id) ?? null;
}

/** Score skills by trigger-keyword presence in the query; return the best (or null). */
export function pickSkill(query: string, skills: SkillDef[]): SkillDef | null {
  const q = ` ${query.toLowerCase()} `;
  let best: SkillDef | null = null;
  let bestScore = 0;
  for (const s of skills) {
    let score = 0;
    for (const t of s.triggers) if (t && q.includes(t)) score += t.length >= 5 ? 2 : 1;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore > 0 ? best : null;
}

/** Resolve which skill should run for a request: pinned wins, else auto-pick. */
export function resolveActiveSkill(
  query: string,
  userSkills: SkillDef[],
  activeId: string | null,
  autoSelect: boolean,
): SkillDef | null {
  const pinned = getSkill(activeId, userSkills);
  if (pinned) return pinned;
  if (autoSelect) return pickSkill(query, allSkills(userSkills));
  return null;
}

export function formatSkillForPrompt(skill: SkillDef): string {
  return `Active skill — ${skill.name}: ${skill.instructions}`;
}
