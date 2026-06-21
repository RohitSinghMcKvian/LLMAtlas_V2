"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — dynamic tool registry
//
// The /code agent historically had a *static* tool list (AGENT_TOOLS in
// tools.ts). To support Hermes-style pluggable tools (MCP servers, web tools,
// platform tools) we layer a runtime registry on top: built-in tools are always
// present, and additional tools can be registered/unregistered by namespace
// (e.g. one namespace per MCP server). Any surface — the /code AgentRail today,
// the global Atlas Agent later — drives the agent through this single registry.
//
// Design notes:
// - Built-ins stay defined in src/lib/code/tools.ts (their handlers live there);
//   this module re-exports a unified `executeTool` / `isMutatingTool` that knows
//   about both built-in and dynamic tools. tools.ts does NOT import this module
//   (one-way dependency → no cycle).
// - Dynamic tools are held in a tiny zustand store so React surfaces re-render
//   when servers connect/disconnect, while non-React callers read getState().
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
  AGENT_TOOLS,
  MUTATING_TOOLS,
  executeTool as executeBuiltinTool,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
} from "@/lib/code/tools";

export type { ToolDefinition, ToolCall, ToolResult };

/** A tool contributed at runtime (MCP server, web tool, platform tool, …). */
export interface DynamicTool {
  /** JSON-schema definition advertised to the model. `name` must be globally unique. */
  definition: ToolDefinition;
  /** Namespace this tool belongs to, e.g. `mcp:<serverId>`. Used for bulk removal. */
  namespace: string;
  /** Whether calling the tool can change external/workspace state (→ approval-gated). */
  mutating: boolean;
  /** Executes the call. Receives the parsed args; returns a ToolResult. */
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

interface RegistryState {
  /** name → DynamicTool. */
  dynamic: Record<string, DynamicTool>;
  /** Replace every tool in a namespace with the given set (idempotent reconnects). */
  registerNamespace: (namespace: string, tools: DynamicTool[]) => void;
  /** Remove all tools in a namespace (server disabled/removed). */
  clearNamespace: (namespace: string) => void;
}

export const useToolRegistry = create<RegistryState>((set) => ({
  dynamic: {},
  registerNamespace: (namespace, tools) =>
    set((s) => {
      const next: Record<string, DynamicTool> = {};
      // keep tools from other namespaces
      for (const [name, t] of Object.entries(s.dynamic)) {
        if (t.namespace !== namespace) next[name] = t;
      }
      // add/replace this namespace's tools
      for (const t of tools) next[t.definition.name] = { ...t, namespace };
      return { dynamic: next };
    }),
  clearNamespace: (namespace) =>
    set((s) => {
      const next: Record<string, DynamicTool> = {};
      for (const [name, t] of Object.entries(s.dynamic)) {
        if (t.namespace !== namespace) next[name] = t;
      }
      return { dynamic: next };
    }),
}));

// ── Non-React accessors (safe to call from the agent loop) ───────────────────

function dynamicTools(): Record<string, DynamicTool> {
  return useToolRegistry.getState().dynamic;
}

export function getDynamicTool(name: string): DynamicTool | undefined {
  return dynamicTools()[name];
}

export function isDynamicTool(name: string): boolean {
  return Boolean(dynamicTools()[name]);
}

/** Every tool definition the model should be told about (built-in + dynamic). */
export function allToolDefinitions(): ToolDefinition[] {
  return [...AGENT_TOOLS, ...Object.values(dynamicTools()).map((t) => t.definition)];
}

/** True for built-in workspace mutations AND any external/dynamic tool. */
export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name) || (dynamicTools()[name]?.mutating ?? false);
}

/**
 * Execute a tool call against the registry. Dynamic tools are routed to their
 * own handler; everything else falls through to the built-in implementation.
 */
export async function executeTool(
  workspaceId: string,
  call: ToolCall,
  onChunk?: (s: string) => void,
): Promise<ToolResult> {
  const dyn = dynamicTools()[call.name];
  if (dyn) {
    try {
      return await dyn.execute(call.args ?? {});
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "external tool failed" };
    }
  }
  return executeBuiltinTool(workspaceId, call, onChunk);
}
