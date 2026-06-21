"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — agent traces & replay (Phase 6)
//
// Every Atlas run is recorded as a replayable trace: the ordered steps (user
// prompt, assistant text, tool calls + sub-agents), the model + skill used, and
// cost/timing. Traces are persisted (capped) so the user can revisit, replay
// (step through with timing), and export/share a past run — great for the Learn
// pillar and for debugging agent behaviour.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { AtlasMessage } from "@/lib/brain/atlas-agent-store";

export interface Trace {
  id: string;
  title: string;
  modelId: string;
  modelName: string;
  skillName?: string;
  /** Frozen snapshot of the run's messages (user/assistant/tool + sub-agents). */
  messages: AtlasMessage[];
  toolCalls: number;
  costUSD: number;
  durationMs: number;
  createdAt: number;
}

interface TraceStore {
  traces: Trace[];
  record: (input: Omit<Trace, "id" | "createdAt">) => Trace;
  remove: (id: string) => void;
  clear: () => void;
}

const MAX_TRACES = 40;

export const useTraceStore = create<TraceStore>()(
  persist(
    (set) => ({
      traces: [],
      record: (input) => {
        const t: Trace = { ...input, id: nanoid(10), createdAt: Date.now() };
        set((s) => ({ traces: [t, ...s.traces].slice(0, MAX_TRACES) }));
        return t;
      },
      remove: (id) => set((s) => ({ traces: s.traces.filter((t) => t.id !== id) })),
      clear: () => set({ traces: [] }),
    }),
    { name: "llmatlas-traces", storage: createJSONStorage(() => localStorage) },
  ),
);

/** Serialize a trace to a shareable JSON string. */
export function traceToJson(t: Trace): string {
  return JSON.stringify(
    {
      title: t.title,
      model: t.modelName,
      skill: t.skillName,
      toolCalls: t.toolCalls,
      costUSD: t.costUSD,
      durationMs: t.durationMs,
      createdAt: new Date(t.createdAt).toISOString(),
      steps: t.messages.map((m) =>
        m.role === "tool"
          ? { role: "tool", tool: m.tool?.name, ok: m.tool?.ok, subagents: m.tool?.subagents?.map((s) => ({ role: s.role, status: s.status })) }
          : { role: m.role, content: m.content },
      ),
    },
    null,
    2,
  );
}
