"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — MCP client loader
//
// Reads the user's configured MCP servers, asks the /api/mcp bridge for each
// server's tools, and registers them into the dynamic tool registry so the
// agent can call them. Tool calls are routed back through /api/mcp.
//
// Naming: registry tool name = mcp__<serverSlug>__<toolSlug> (safe for native
// function-calling), but the *original* MCP tool name is what we send to the
// server on call_tool.
// ─────────────────────────────────────────────────────────────────────────────

import type { McpServerConfig } from "@/lib/store";
import { useToolRegistry, type DynamicTool, type ToolResult } from "@/lib/brain/registry";

interface McpToolSpec {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; title?: string };
}

interface McpCallContent {
  type: string;
  text?: string;
}

export function mcpNamespace(serverId: string): string {
  return `mcp:${serverId}`;
}

function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "x";
}

function registryToolName(server: McpServerConfig, toolName: string): string {
  return `mcp__${slug(server.name || server.id)}__${slug(toolName)}`;
}

/** A bridge request, minus the action — server creds stay only in the payload. */
function serverSpec(server: McpServerConfig) {
  return { url: server.url, authHeader: server.authHeader };
}

async function bridge(body: unknown): Promise<unknown> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; error?: string; tools?: unknown; result?: unknown };
  if (!json.ok) throw new Error(json.error ?? `MCP bridge failed (HTTP ${res.status})`);
  return json;
}

/** Flatten an MCP tools/call result into a ToolResult the agent loop understands. */
function toToolResult(result: unknown): ToolResult {
  const r = result as { content?: McpCallContent[]; isError?: boolean; structuredContent?: unknown } | undefined;
  const text = (r?.content ?? [])
    .map((c) => (c.type === "text" ? c.text ?? "" : `[${c.type}]`))
    .join("\n")
    .trim();
  const output = text || (r?.structuredContent ? JSON.stringify(r.structuredContent) : "(no output)");
  if (r?.isError) return { ok: false, error: output };
  return { ok: true, output };
}

function toDynamicTool(server: McpServerConfig, spec: McpToolSpec): DynamicTool {
  const name = registryToolName(server, spec.name);
  const readOnly = spec.annotations?.readOnlyHint === true;
  return {
    namespace: mcpNamespace(server.id),
    mutating: !readOnly, // external tools are approval-gated unless explicitly read-only
    definition: {
      name,
      description: `[${server.name}] ${spec.description ?? spec.name}`,
      parameters: (spec.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
    },
    execute: async (args) => {
      try {
        const json = (await bridge({
          action: "call_tool",
          server: serverSpec(server),
          name: spec.name,
          args,
        })) as { result?: unknown };
        return toToolResult(json.result);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "MCP call failed" };
      }
    },
  };
}

export interface McpSyncResult {
  serverId: string;
  ok: boolean;
  toolCount: number;
  error?: string;
}

/** Connect to one server and (re)register its tools. */
export async function syncMcpServer(server: McpServerConfig): Promise<McpSyncResult> {
  try {
    const json = (await bridge({ action: "list_tools", server: serverSpec(server) })) as {
      tools?: McpToolSpec[];
    };
    const tools = (json.tools ?? []).map((t) => toDynamicTool(server, t));
    useToolRegistry.getState().registerNamespace(mcpNamespace(server.id), tools);
    return { serverId: server.id, ok: true, toolCount: tools.length };
  } catch (e) {
    // Drop any stale tools for a server that failed to connect.
    useToolRegistry.getState().clearNamespace(mcpNamespace(server.id));
    return { serverId: server.id, ok: false, toolCount: 0, error: e instanceof Error ? e.message : "connect failed" };
  }
}

/** Sync all enabled servers; clears tools for disabled/removed ones. */
export async function syncAllMcpServers(servers: McpServerConfig[]): Promise<McpSyncResult[]> {
  const reg = useToolRegistry.getState();
  for (const s of servers) {
    if (!s.enabled) reg.clearNamespace(mcpNamespace(s.id));
  }
  const enabled = servers.filter((s) => s.enabled);
  return Promise.all(enabled.map(syncMcpServer));
}
