"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — global "Atlas Agent" store (Phase 5)
//
// The same headless brain (loop.ts + memory) surfaced platform-wide, not just in
// /code. This holds the global assistant's conversation + open state. It is
// deliberately NOT persisted — the global agent is a transient command surface
// (the durable layer is the shared memory store).
//
// Also exports a tiny transient "pending compare" store: the compare_models
// platform tool stashes a selection here and the /compare page consumes it on
// mount — letting the agent preload a side-by-side comparison cross-pillar.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { nanoid } from "nanoid";

/** Live state of one delegated sub-agent (shown nested under a `delegate` tool row). */
export interface SubagentState {
  id: string;
  role: string;
  task: string;
  status: "running" | "done" | "error";
  summary?: string;
  toolCount: number;
}

export interface AtlasMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  /** For tool rows. `subagents` is populated while a `delegate` call fans out. */
  tool?: { name: string; args: Record<string, unknown>; ok?: boolean; subagents?: SubagentState[] };
  createdAt: number;
}

interface AtlasAgentState {
  open: boolean;
  busy: boolean;
  messages: AtlasMessage[];
  setOpen: (v: boolean) => void;
  setBusy: (v: boolean) => void;
  reset: () => void;
  addUser: (content: string) => void;
  addAssistant: (id: string) => void;
  updateMessage: (id: string, content: string) => void;
  addTool: (name: string, args: Record<string, unknown>) => string;
  resolveTool: (id: string, ok: boolean) => void;
  setToolSubagents: (id: string, subagents: SubagentState[]) => void;
  pruneEmpty: () => void;
}

export const useAtlasAgentStore = create<AtlasAgentState>((set) => ({
  open: false,
  busy: false,
  messages: [],
  setOpen: (v) => set({ open: v }),
  setBusy: (v) => set({ busy: v }),
  reset: () => set({ messages: [], busy: false }),
  addUser: (content) =>
    set((s) => ({ messages: [...s.messages, { id: nanoid(8), role: "user", content, createdAt: Date.now() }] })),
  addAssistant: (id) =>
    set((s) => ({ messages: [...s.messages, { id, role: "assistant", content: "", createdAt: Date.now() }] })),
  updateMessage: (id, content) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)) })),
  addTool: (name, args) => {
    const id = nanoid(8);
    set((s) => ({ messages: [...s.messages, { id, role: "tool", content: "", tool: { name, args }, createdAt: Date.now() }] }));
    return id;
  },
  resolveTool: (id, ok) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id && m.tool ? { ...m, tool: { ...m.tool, ok } } : m)) })),
  setToolSubagents: (id, subagents) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id && m.tool ? { ...m, tool: { ...m.tool, subagents } } : m)) })),
  // Drop empty assistant placeholders left over from tool-only turns.
  pruneEmpty: () =>
    set((s) => ({ messages: s.messages.filter((m) => m.role !== "assistant" || m.content.trim() !== "") })),
}));

// ── Pending compare preset (consumed by /compare on mount) ───────────────────

interface PendingCompareState {
  models: string[] | null;
  prompt: string | null;
  set: (models: string[], prompt?: string) => void;
  consume: () => { models: string[]; prompt: string | null } | null;
}

export const usePendingCompare = create<PendingCompareState>((set, get) => ({
  models: null,
  prompt: null,
  set: (models, prompt) => set({ models, prompt: prompt ?? null }),
  consume: () => {
    const { models, prompt } = get();
    if (!models) return null;
    set({ models: null, prompt: null });
    return { models, prompt };
  },
}));
