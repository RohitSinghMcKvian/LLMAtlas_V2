// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — MCP server bridge
//
// The agent loop runs client-side (WebContainer/Pyodide are browser-only), but
// browsers can't speak the MCP Streamable-HTTP transport to arbitrary origins
// (CORS, auth-header secrecy). This stateless route proxies two operations to a
// remote MCP server over JSON-RPC 2.0:
//   • { action: "list_tools", server }            → tools/list
//   • { action: "call_tool", server, name, args } → tools/call
//
// Each request performs the full MCP handshake (initialize → initialized →
// operation) so the route stays stateless. Auth headers stay on the server.
// Only HTTP(S) MCP servers are supported here; stdio servers would need a
// long-lived host process (future work).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PROTOCOL_VERSION = "2025-06-18";
const FETCH_TIMEOUT_MS = 20_000;

interface ServerSpec {
  url: string;
  authHeader?: string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function baseHeaders(server: ServerSpec, sessionId?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (server.authHeader) h.Authorization = server.authHeader;
  if (sessionId) h["Mcp-Session-Id"] = sessionId;
  return h;
}

/** Extract the JSON-RPC message from either a JSON body or an SSE stream. */
async function readRpc(res: Response): Promise<JsonRpcResponse | null> {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (ct.includes("text/event-stream")) {
    // Concatenate `data:` lines; the last complete JSON object is our response.
    let last: JsonRpcResponse | null = null;
    for (const line of text.split(/\r?\n/)) {
      const m = /^data:\s?(.*)$/.exec(line);
      if (!m || !m[1].trim()) continue;
      try {
        const parsed = JSON.parse(m[1]) as JsonRpcResponse;
        if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) last = parsed;
      } catch {
        /* ignore partial frames */
      }
    }
    return last;
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as JsonRpcResponse;
  } catch {
    return null;
  }
}

async function rpcFetch(
  server: ServerSpec,
  body: unknown,
  sessionId: string | undefined,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(server.url, {
      method: "POST",
      headers: baseHeaders(server, sessionId),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Handshake with the server; returns the negotiated session id (if any). */
async function handshake(server: ServerSpec): Promise<string | undefined> {
  const res = await rpcFetch(
    server,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "LLMAtlas", version: "0.1.0" },
      },
    },
    undefined,
  );
  if (!res.ok) {
    throw new Error(`initialize failed: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  }
  const sessionId = res.headers.get("mcp-session-id") ?? undefined;
  const rpc = await readRpc(res);
  if (rpc?.error) throw new Error(`initialize error: ${rpc.error.message}`);
  // Notify the server we're ready (fire-and-forget; some servers require it).
  try {
    await rpcFetch(server, { jsonrpc: "2.0", method: "notifications/initialized" }, sessionId);
  } catch {
    /* notification failures are non-fatal */
  }
  return sessionId;
}

async function callRpc(
  server: ServerSpec,
  method: string,
  params: unknown,
): Promise<unknown> {
  const sessionId = await handshake(server);
  const res = await rpcFetch(
    server,
    { jsonrpc: "2.0", id: 2, method, params },
    sessionId,
  );
  if (!res.ok) {
    throw new Error(`${method} failed: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  }
  const rpc = await readRpc(res);
  if (!rpc) throw new Error(`${method}: empty response`);
  if (rpc.error) throw new Error(`${method} error: ${rpc.error.message}`);
  return rpc.result;
}

export async function POST(req: Request) {
  let payload: {
    action?: string;
    server?: ServerSpec;
    name?: string;
    args?: Record<string, unknown>;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const { action, server, name, args } = payload;
  if (!server?.url || !/^https?:\/\//i.test(server.url)) {
    return NextResponse.json({ ok: false, error: "server.url must be an http(s) URL" }, { status: 400 });
  }

  try {
    if (action === "list_tools") {
      const result = (await callRpc(server, "tools/list", {})) as { tools?: unknown[] };
      return NextResponse.json({ ok: true, tools: result.tools ?? [] });
    }
    if (action === "call_tool") {
      if (!name) {
        return NextResponse.json({ ok: false, error: "name is required for call_tool" }, { status: 400 });
      }
      const result = await callRpc(server, "tools/call", { name, arguments: args ?? {} });
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ ok: false, error: `unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "MCP request failed" },
      { status: 502 },
    );
  }
}
