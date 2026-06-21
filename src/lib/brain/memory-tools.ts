"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — memory tools (Phase 3)
//
// Registers three tools into the dynamic registry under the `memory` namespace:
//   • remember(text, type?)        — persist a durable memory
//   • recall(query, k?)            — retrieve relevant memories across sessions
//   • search_workspace(query, k?)  — semantic search over the current workspace
//                                    files (complements literal grep/glob)
//
// They're marked non-mutating so they auto-run in every autonomy mode (they only
// touch the user's own local notes / read files — no external side effects, no
// approval friction). Registration is idempotent; call registerMemoryTools()
// once when an agent surface mounts.
// ─────────────────────────────────────────────────────────────────────────────

import { useWorkspaceStore } from "@/lib/store";
import { useToolRegistry, type DynamicTool, type ToolResult } from "@/lib/brain/registry";
import {
  remember,
  recall,
  embedTexts,
  cosineSim,
  MEMORY_TYPES,
  type MemoryType,
} from "@/lib/brain/memory";

export const MEMORY_NAMESPACE = "memory";

function currentWorkspaceId(): string | undefined {
  return useWorkspaceStore.getState().currentId ?? undefined;
}

/** Split a file into overlapping line windows so long files stay searchable. */
function chunkFile(path: string, content: string): Array<{ path: string; line: number; text: string }> {
  const lines = content.split("\n");
  const WINDOW = 40;
  const STEP = 30;
  const chunks: Array<{ path: string; line: number; text: string }> = [];
  for (let i = 0; i < lines.length; i += STEP) {
    const slice = lines.slice(i, i + WINDOW).join("\n").trim();
    if (slice) chunks.push({ path, line: i + 1, text: slice.slice(0, 1500) });
    if (i + WINDOW >= lines.length) break;
  }
  return chunks;
}

const rememberTool: DynamicTool = {
  namespace: MEMORY_NAMESPACE,
  mutating: false,
  definition: {
    name: "remember",
    description:
      "Save a durable memory so future sessions recall it. Use for user preferences, stable facts, notable completed tasks, or reusable approaches (skills). Be concise and specific.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The fact/preference/skill to remember, in one sentence." },
        type: { type: "string", enum: MEMORY_TYPES, description: "Memory category (default: fact)." },
      },
      required: ["text"],
    },
  },
  execute: async (args): Promise<ToolResult> => {
    const text = String(args.text ?? "").trim();
    if (!text) return { ok: false, error: "text is required" };
    const type = (MEMORY_TYPES as string[]).includes(String(args.type)) ? (args.type as MemoryType) : "fact";
    try {
      const { memory, deduped } = await remember({ text, type, sourceWorkspace: currentWorkspaceId() });
      return { ok: true, output: `${deduped ? "updated existing" : "remembered"} ${memory.type}: "${memory.text}"` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "remember failed" };
    }
  },
};

const recallTool: DynamicTool = {
  namespace: MEMORY_NAMESPACE,
  mutating: false,
  definition: {
    name: "recall",
    description:
      "Retrieve relevant memories from previous sessions (preferences, facts, past tasks, skills) ranked by similarity to a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you want to remember about." },
        k: { type: "number", description: "Max results (default 5)." },
      },
      required: ["query"],
    },
  },
  execute: async (args): Promise<ToolResult> => {
    const query = String(args.query ?? "").trim();
    if (!query) return { ok: false, error: "query is required" };
    const k = typeof args.k === "number" ? Math.max(1, Math.min(20, args.k)) : 5;
    try {
      const hits = await recall(query, k);
      if (hits.length === 0) return { ok: true, output: "(no relevant memories)" };
      return {
        ok: true,
        output: hits.map((h) => ({ type: h.memory.type, text: h.memory.text, score: Number(h.score.toFixed(3)) })),
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "recall failed" };
    }
  },
};

const searchWorkspaceTool: DynamicTool = {
  namespace: MEMORY_NAMESPACE,
  mutating: false,
  definition: {
    name: "search_workspace",
    description:
      "Semantic search over the current workspace's files — finds relevant code/text by meaning, not exact text. Use when grep/glob can't find a concept. Returns the most similar file passages.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Concept or question to search for." },
        k: { type: "number", description: "Max passages (default 6)." },
      },
      required: ["query"],
    },
  },
  execute: async (args): Promise<ToolResult> => {
    const query = String(args.query ?? "").trim();
    if (!query) return { ok: false, error: "query is required" };
    const k = typeof args.k === "number" ? Math.max(1, Math.min(20, args.k)) : 6;
    const wsId = currentWorkspaceId();
    const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === wsId);
    if (!ws) return { ok: false, error: "no active workspace" };

    // Build chunks (cap total so one batch embed stays cheap).
    const chunks: Array<{ path: string; line: number; text: string }> = [];
    for (const f of ws.files) {
      for (const c of chunkFile(f.path, f.content)) {
        chunks.push(c);
        if (chunks.length >= 120) break;
      }
      if (chunks.length >= 120) break;
    }
    if (chunks.length === 0) return { ok: true, output: "(workspace is empty)" };

    try {
      const { embeddings } = await embedTexts([query, ...chunks.map((c) => c.text)]);
      const qv = embeddings[0];
      const ranked = chunks
        .map((c, i) => ({ ...c, score: cosineSim(qv, embeddings[i + 1]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map((c) => ({ path: c.path, line: c.line, score: Number(c.score.toFixed(3)), preview: c.text.slice(0, 240) }));
      return { ok: true, output: ranked };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "search_workspace failed" };
    }
  },
};

let registered = false;

/** Register the memory tools into the dynamic registry (idempotent). */
export function registerMemoryTools(): void {
  if (registered) return;
  useToolRegistry.getState().registerNamespace(MEMORY_NAMESPACE, [
    rememberTool,
    recallTool,
    searchWorkspaceTool,
  ]);
  registered = true;
}
