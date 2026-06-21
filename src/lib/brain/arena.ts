"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — Comparison Arena engine
//
// The headline LLMAtlas feature: give one coding task to N models at once, each
// with an *identical* toolset over its *own isolated* copy of the workspace, run
// their agent loops in parallel, and compare how they plan, what code they
// produce, and what they cost — then promote the winner into the real workspace.
//
// WebContainer/Pyodide are singletons (only one sandbox exists in the browser),
// so arena lanes can't run shell commands concurrently. Instead each lane gets a
// fast, parallel-safe *in-memory* file sandbox (read/write/edit/glob/grep/plan).
// You compare planning + generated code + cost here, then promote a winner and
// run it for real in the main /code sandbox.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { findModel, supportsTools } from "@/lib/models";
import {
  AGENT_TOOLS,
  buildReadmeScaffold,
  type ToolCall,
  type ToolResult,
  type ToolDefinition,
} from "@/lib/code/tools";
import type { Workspace, WorkspaceFile, WorkspaceRuntime } from "@/lib/store";
import { buildSystemPrompt } from "@/lib/brain/prompt";
import { runAgentLoop, type AgentEvent } from "@/lib/brain/loop";

export type FileMap = Record<string, string>;

/** Tools an arena lane may use — pure, in-memory, parallel-safe (no shell). */
const ARENA_TOOL_NAMES = new Set([
  "list_dir", "read_file", "write_file", "edit_file", "delete_file",
  "glob", "grep", "update_plan", "generate_docs",
]);

function arenaToolDefs(): ToolDefinition[] {
  return AGENT_TOOLS.filter((t) => ARENA_TOOL_NAMES.has(t.name));
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^$()|[\]{}\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLESTAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLESTAR::/g, ".*")
    .replace(/\?/g, "[^/]");
  return new RegExp("^" + escaped + "$");
}

function syntheticWorkspace(name: string, runtime: WorkspaceRuntime, files: FileMap): Workspace {
  const now = Date.now();
  const wf: WorkspaceFile[] = Object.entries(files).map(([path, content]) => ({ path, content, updatedAt: now }));
  return { id: "arena", name, runtime, files: wf, openTabs: [], activePath: null, createdAt: now, updatedAt: now };
}

interface ExecutorHooks {
  onPlan: (steps: { text: string; status: string }[]) => void;
  runtime: WorkspaceRuntime;
}

/** Build an in-memory tool executor that mutates `files` in place. */
export function makeArenaExecutor(files: FileMap, hooks: ExecutorHooks) {
  return async function execute(call: ToolCall): Promise<ToolResult> {
    const a = call.args ?? {};
    try {
      switch (call.name) {
        case "list_dir": {
          const prefix = (a.path as string) ?? "";
          return { ok: true, output: Object.keys(files).filter((p) => p.startsWith(prefix)).sort() };
        }
        case "read_file": {
          const path = a.path as string;
          return path in files ? { ok: true, output: files[path] } : { ok: false, error: `file not found: ${path}` };
        }
        case "write_file": {
          const path = a.path as string;
          const content = a.content as string;
          files[path] = content;
          return { ok: true, output: `wrote ${path} (${content.length} bytes)` };
        }
        case "edit_file": {
          const path = a.path as string;
          const oldStr = a.old_str as string;
          const newStr = a.new_str as string;
          if (!(path in files)) return { ok: false, error: `file not found: ${path}` };
          const occ = files[path].split(oldStr).length - 1;
          if (occ === 0) return { ok: false, error: "old_str not found" };
          if (occ > 1) return { ok: false, error: `old_str appears ${occ} times — make it more specific` };
          files[path] = files[path].replace(oldStr, newStr);
          return { ok: true, output: `edited ${path}` };
        }
        case "delete_file": {
          const path = a.path as string;
          delete files[path];
          return { ok: true, output: `deleted ${path}` };
        }
        case "glob": {
          const re = globToRegex(a.pattern as string);
          return { ok: true, output: Object.keys(files).filter((p) => re.test(p)).sort() };
        }
        case "grep": {
          const re = new RegExp(a.pattern as string, "i");
          const prefix = (a.path as string | undefined) ?? "";
          const hits: Array<{ path: string; line: number; text: string }> = [];
          for (const [path, content] of Object.entries(files)) {
            if (!path.startsWith(prefix)) continue;
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (re.test(lines[i])) { hits.push({ path, line: i + 1, text: lines[i].slice(0, 200) }); if (hits.length >= 50) break; }
            }
            if (hits.length >= 50) break;
          }
          return { ok: true, output: hits };
        }
        case "update_plan": {
          const raw = (a.steps ?? a.plan ?? []) as Array<{ text?: string; step?: string; status?: string }>;
          const steps = raw
            .map((s) => ({ text: String(s.text ?? s.step ?? "").slice(0, 240), status: s.status === "done" || s.status === "in_progress" ? s.status : "pending" }))
            .filter((s) => s.text);
          hooks.onPlan(steps);
          return { ok: true, output: `plan updated — ${steps.length} steps` };
        }
        case "generate_docs": {
          return { ok: true, output: buildReadmeScaffold(syntheticWorkspace("arena", hooks.runtime, files)) };
        }
        default:
          return { ok: false, error: `tool "${call.name}" is disabled in the Comparison Arena. Available: ${[...ARENA_TOOL_NAMES].join(", ")}. Compare planning & generated code here, then promote a winner to run it.` };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "tool failed" };
    }
  };
}

// ── Arena store ──────────────────────────────────────────────────────────────

export type LaneStatus = "idle" | "running" | "done" | "error" | "aborted";

export interface ArenaLane {
  modelId: string;
  status: LaneStatus;
  /** Live assistant text for the current turn. */
  text: string;
  /** Final assistant summaries across turns. */
  summary: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; ok?: boolean }>;
  plan: Array<{ text: string; status: string }>;
  files: FileMap;
  changedPaths: Set<string>;
  turns: number;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  doneReason?: string;
  error?: string;
  startedAt: number;
  elapsedMs: number;
}

interface ArenaState {
  task: string;
  running: boolean;
  order: string[];
  lanes: Record<string, ArenaLane>;
  setTask: (t: string) => void;
  reset: () => void;
  _init: (modelIds: string[], baseFiles: FileMap) => void;
  _patch: (modelId: string, fn: (l: ArenaLane) => ArenaLane) => void;
  _setRunning: (v: boolean) => void;
}

export const useArenaStore = create<ArenaState>((set) => ({
  task: "",
  running: false,
  order: [],
  lanes: {},
  setTask: (t) => set({ task: t }),
  reset: () => set({ running: false, order: [], lanes: {} }),
  _init: (modelIds, baseFiles) =>
    set(() => {
      const lanes: Record<string, ArenaLane> = {};
      for (const id of modelIds) {
        lanes[id] = {
          modelId: id, status: "running", text: "", summary: "", toolCalls: [], plan: [],
          files: { ...baseFiles }, changedPaths: new Set(), turns: 0, tokensIn: 0, tokensOut: 0,
          costUSD: 0, startedAt: Date.now(), elapsedMs: 0,
        };
      }
      return { order: modelIds, lanes, running: true };
    }),
  _patch: (modelId, fn) =>
    set((s) => {
      const lane = s.lanes[modelId];
      if (!lane) return s;
      return { lanes: { ...s.lanes, [modelId]: fn(lane) } };
    }),
  _setRunning: (v) => set({ running: v }),
}));

let arenaAbort: AbortController | null = null;

export function stopArena() {
  arenaAbort?.abort();
}

export interface RunArenaInput {
  task: string;
  modelIds: string[];
  baseFiles: WorkspaceFile[];
  runtime: WorkspaceRuntime;
  byok: Partial<Record<string, string>>;
}

/** Kick off all lanes in parallel. Resolves when every lane finishes. */
export async function runArena(input: RunArenaInput): Promise<void> {
  const { task, modelIds, baseFiles, runtime, byok } = input;
  const store = useArenaStore.getState();
  const baseMap: FileMap = Object.fromEntries(baseFiles.map((f) => [f.path, f.content]));

  store._init(modelIds, baseMap);
  arenaAbort = new AbortController();
  const toolDefs = arenaToolDefs();
  const patch = useArenaStore.getState()._patch;

  const arenaTask = `${task}\n\nNote: this run is in the Comparison Arena — shell/test execution is disabled. Plan, then write the actual code files. Finish with a one-line summary.`;

  const runLane = async (modelId: string) => {
    const model = findModel(modelId);
    if (!model) { patch(modelId, (l) => ({ ...l, status: "error", error: "unknown model" })); return; }
    const useNativeTools = supportsTools(model);
    const laneFiles = useArenaStore.getState().lanes[modelId].files; // mutated in place by executor
    const ws = syntheticWorkspace(`arena-${modelId}`, runtime, laneFiles);
    const systemPrompt = buildSystemPrompt(ws, useNativeTools, toolDefs);

    const executor = makeArenaExecutor(laneFiles, {
      runtime,
      onPlan: (steps) => patch(modelId, (l) => ({ ...l, plan: steps })),
    });

    await runAgentLoop({
      modelId,
      apiKey: byok[model.provider],
      systemPrompt,
      messages: [{ role: "user", content: arenaTask }],
      toolDefs,
      useNativeTools,
      executeTool: executor,
      signal: arenaAbort!.signal,
      onEvent: (e: AgentEvent) => handleEvent(modelId, e),
    });
  };

  await Promise.all(modelIds.map(runLane));
  useArenaStore.getState()._setRunning(false);
  arenaAbort = null;
}

function handleEvent(modelId: string, e: AgentEvent) {
  const patch = useArenaStore.getState()._patch;
  switch (e.type) {
    case "turn_start":
      patch(modelId, (l) => ({ ...l, turns: e.turn + 1, text: "", elapsedMs: Date.now() - l.startedAt }));
      break;
    case "text":
      patch(modelId, (l) => ({ ...l, text: e.text }));
      break;
    case "assistant_done":
      patch(modelId, (l) => ({ ...l, summary: e.text || l.summary, text: "" }));
      break;
    case "tool_call":
      patch(modelId, (l) => ({ ...l, toolCalls: [...l.toolCalls, { name: e.call.name, args: e.call.args }] }));
      break;
    case "tool_result":
      patch(modelId, (l) => {
        const toolCalls = l.toolCalls.slice();
        for (let i = toolCalls.length - 1; i >= 0; i--) {
          if (toolCalls[i].ok === undefined) { toolCalls[i] = { ...toolCalls[i], ok: e.result.ok }; break; }
        }
        const changedPaths = new Set(l.changedPaths);
        if (e.result.ok && ["write_file", "edit_file", "delete_file"].includes(e.call.name) && e.call.args.path) {
          changedPaths.add(e.call.args.path as string);
        }
        return { ...l, toolCalls, changedPaths, files: { ...l.files } };
      });
      break;
    case "usage":
      patch(modelId, (l) => ({
        ...l,
        tokensIn: l.tokensIn + e.promptTokens,
        tokensOut: l.tokensOut + e.completionTokens,
        costUSD: l.costUSD + e.costUSD,
        elapsedMs: Date.now() - l.startedAt,
      }));
      break;
    case "error":
      patch(modelId, (l) => ({ ...l, error: e.message }));
      break;
    case "done":
      patch(modelId, (l) => ({
        ...l,
        status: e.reason === "aborted" ? "aborted" : l.error ? "error" : "done",
        doneReason: e.reason,
        elapsedMs: Date.now() - l.startedAt,
      }));
      break;
  }
}
