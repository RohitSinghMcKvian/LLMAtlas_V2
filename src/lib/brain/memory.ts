"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — persistent memory (Phase 3: cross-session learning / RAG)
//
// The /code agent was stateless across sessions: every task started cold. This
// gives the brain a durable, vector-searchable memory of user preferences,
// facts, completed tasks, and reusable skills. Memories are embedded via the
// /api/embed route and ranked by cosine similarity at recall time, then the most
// relevant ones are injected into the system prompt so the agent "remembers".
//
// Storage is localStorage (consistent with the rest of LLMAtlas); each memory
// records the embedding *model* that produced its vector so a backend change
// can't silently corrupt similarity math — vectors of a different length are
// skipped (cosineSim guards on length) and can be re-embedded.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export type MemoryType = "preference" | "fact" | "task" | "skill";

export const MEMORY_TYPES: MemoryType[] = ["preference", "fact", "task", "skill"];

export const MEMORY_TYPE_META: Record<MemoryType, { label: string; hint: string }> = {
  preference: { label: "Preference", hint: "How you like things done (style, tools, conventions)" },
  fact: { label: "Fact", hint: "Durable facts about you or your projects" },
  task: { label: "Task", hint: "Notable tasks completed and how" },
  skill: { label: "Skill", hint: "Reusable approaches the agent should reapply" },
};

export interface Memory {
  id: string;
  type: MemoryType;
  text: string;
  /** L2-normalised embedding vector (cosine == dot product). */
  embedding: number[];
  /** Embedding backend id, e.g. "local/hash-v2" — guards cross-backend math. */
  model: string;
  /** Workspace this was learned in (optional). */
  sourceWorkspace?: string;
  pinned?: boolean;
  useCount: number;
  createdAt: number;
  lastUsedAt?: number;
}

export interface ScoredMemory {
  memory: Memory;
  score: number;
}

interface MemoryState {
  memories: Memory[];
  /** When true, relevant memories are auto-injected into the agent system prompt. */
  autoInject: boolean;
  /** Max memories injected per run. */
  injectK: number;
  /** Last embedding backend reported by /api/embed (for the UI status badge). */
  backend: string;
  _add: (m: Memory) => void;
  _replaceAll: (ms: Memory[]) => void;
  update: (id: string, patch: Partial<Pick<Memory, "text" | "type" | "pinned">>) => void;
  remove: (id: string) => void;
  clear: () => void;
  togglePin: (id: string) => void;
  setAutoInject: (v: boolean) => void;
  setInjectK: (k: number) => void;
  _setBackend: (b: string) => void;
  bumpUsage: (ids: string[]) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      memories: [],
      autoInject: true,
      injectK: 5,
      backend: "local/hash-v2",
      _add: (m) => set((s) => ({ memories: [m, ...s.memories] })),
      _replaceAll: (ms) => set({ memories: ms }),
      update: (id, patch) =>
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      remove: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      clear: () => set({ memories: [] }),
      togglePin: (id) =>
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),
      setAutoInject: (v) => set({ autoInject: v }),
      setInjectK: (k) => set({ injectK: Math.max(1, Math.min(20, Math.round(k))) }),
      _setBackend: (b) => set({ backend: b }),
      bumpUsage: (ids) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            ids.includes(m.id) ? { ...m, useCount: m.useCount + 1, lastUsedAt: Date.now() } : m,
          ),
        })),
    }),
    {
      name: "llmatlas-memory",
      storage: createJSONStorage(() => localStorage),
      // Cap at 500 memories; drop the least-recently-relevant unpinned ones first.
      partialize: (s) => ({
        memories: s.memories.slice(0, 500),
        autoInject: s.autoInject,
        injectK: s.injectK,
        backend: s.backend,
      }),
    },
  ),
);

// ── Embedding ────────────────────────────────────────────────────────────────

export interface EmbedResponse {
  ok: boolean;
  model: string;
  dim: number;
  embeddings: number[][];
  degraded?: string;
  error?: string;
}

/** Embed a batch of texts via /api/embed. Records the active backend for the UI. */
export async function embedTexts(texts: string[]): Promise<{ model: string; embeddings: number[][] }> {
  if (texts.length === 0) return { model: useMemoryStore.getState().backend, embeddings: [] };
  const res = await fetch("/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  const json = (await res.json()) as EmbedResponse;
  if (!json.ok || !json.embeddings) throw new Error(json.error ?? "embedding request failed");
  useMemoryStore.getState()._setBackend(json.model);
  return { model: json.model, embeddings: json.embeddings };
}

export async function embedOne(text: string): Promise<{ model: string; embedding: number[] }> {
  const { model, embeddings } = await embedTexts([text]);
  return { model, embedding: embeddings[0] ?? [] };
}

/** Cosine similarity. Vectors are pre-normalised, but we guard length + norm anyway. */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ── Remember / recall ────────────────────────────────────────────────────────

const DEDUPE_THRESHOLD = 0.93; // near-identical same-type memories are merged

export interface RememberInput {
  text: string;
  type?: MemoryType;
  sourceWorkspace?: string;
}

/**
 * Persist a memory. Embeds the text and, if a near-duplicate of the same type
 * already exists, refreshes that one instead of adding a clone.
 */
export async function remember(input: RememberInput): Promise<{ memory: Memory; deduped: boolean }> {
  const text = input.text.trim();
  if (!text) throw new Error("cannot remember empty text");
  const type = input.type ?? "fact";
  const { model, embedding } = await embedOne(text);

  const store = useMemoryStore.getState();
  const dup = store.memories.find(
    (m) => m.type === type && m.model === model && cosineSim(m.embedding, embedding) >= DEDUPE_THRESHOLD,
  );
  if (dup) {
    store.update(dup.id, { text });
    store.bumpUsage([dup.id]);
    return { memory: { ...dup, text }, deduped: true };
  }

  const memory: Memory = {
    id: nanoid(10),
    type,
    text,
    embedding,
    model,
    sourceWorkspace: input.sourceWorkspace,
    useCount: 0,
    createdAt: Date.now(),
  };
  store._add(memory);
  return { memory, deduped: false };
}

/**
 * Rank stored memories against a query. Pinned memories get a small boost so the
 * user's explicitly-important notes surface reliably.
 */
export async function recall(query: string, k = 5): Promise<ScoredMemory[]> {
  const q = query.trim();
  const memories = useMemoryStore.getState().memories;
  if (!q || memories.length === 0) return [];
  const { embedding } = await embedOne(q);

  const scored = memories
    .map((memory) => {
      const base = cosineSim(memory.embedding, embedding);
      const score = memory.pinned ? Math.min(1, base + 0.08) : base;
      return { memory, score };
    })
    .filter((s) => s.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored;
}

/** Format recalled memories as a compact system-prompt block. */
export function formatMemoriesForPrompt(items: ScoredMemory[]): string {
  if (items.length === 0) return "";
  const lines = items.map(({ memory }) => `- (${memory.type}) ${memory.text}`);
  return `Relevant memory from previous sessions — use it to personalise your work; do not mention this block verbatim unless asked:\n${lines.join("\n")}`;
}
