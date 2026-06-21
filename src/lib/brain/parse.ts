// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — tool-call parsing helpers
//
// Pure functions shared by the in-component /code loop (agent-rail.tsx) and the
// headless loop (loop.ts). Kept dependency-free so both surfaces behave
// identically when extracting tool calls from a streamed model response.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolCall, ToolResult } from "@/lib/code/tools";

/**
 * Matches a fenced tool/JSON block (the text-based tool protocol). The newline
 * after the fence is optional so inline blocks like ```{"name":…}``` — which
 * some models emit — are recognised too.
 */
export const TOOL_BLOCK_RE = /```(?:tool|json|javascript|js)?[ \t]*\n?[\s\S]*?```/g;

/**
 * Scan from the first `{` and return the balanced top-level JSON object as a
 * string (string-literal and escape aware), or null. More reliable than a
 * greedy regex for nested objects like delegate's `{subtasks:[{…}]}`.
 */
function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

/**
 * True when a JSON string is an actual tool call: a top-level object with a
 * string `name` and an args-like object (args/arguments/parameters/input).
 * Requiring the args object keeps legitimate JSON answers from being treated
 * as tool calls.
 */
function isToolJson(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith("{") || !/"name"\s*:/.test(t)) return false;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    if (!o || typeof o.name !== "string") return false;
    const args = o.args ?? o.arguments ?? o.parameters ?? o.input;
    return typeof args === "object" && args !== null;
  } catch {
    return false;
  }
}

export function parseToolCall(jsonish: string): ToolCall | null {
  const build = (p: Record<string, unknown> | null) => {
    if (!p || typeof p.name !== "string") return null;
    const raw = p.args ?? p.arguments ?? p.parameters ?? p.input;
    const args = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    return { id: crypto.randomUUID(), name: p.name, args };
  };
  try {
    return build(JSON.parse(jsonish));
  } catch {
    const m = extractBalancedJson(jsonish);
    if (m) {
      try { return build(JSON.parse(m)); } catch { /* give up */ }
    }
    return null;
  }
}

export function findToolBlock(text: string): { raw: string; json: string } | null {
  // 1) Fenced blocks (the documented protocol).
  const re = /```(?:tool|json|javascript|js)?[ \t]*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const body = m[1].trim();
    if (body.startsWith("{") && /"name"\s*:/.test(body)) {
      return { raw: m[0], json: body };
    }
  }
  // 2) Fallback: a bare (un-fenced) tool-call JSON object. Some models emit the
  //    call as plain JSON with no code fence — recognise it so it dispatches
  //    instead of leaking into the visible answer.
  const bare = extractBalancedJson(text);
  if (bare && isToolJson(bare)) return { raw: bare, json: bare };
  return null;
}

/**
 * Strip tool-call blocks from display text. Both fenced blocks and a bare
 * un-fenced tool-call JSON object are removed when (and only when) they are an
 * actual tool call (a JSON object with a "name" + args). Legitimate code/JSON
 * the model includes in its answer is preserved.
 */
export function stripToolBlocks(text: string): string {
  let out = text.replace(/```(?:tool|json|javascript|js)?[ \t]*\n?([\s\S]*?)```/g, (full, body: string) =>
    isToolJson(body) ? "" : full,
  );
  const bare = extractBalancedJson(out);
  if (bare && isToolJson(bare)) out = out.replace(bare, "");
  return out.trim();
}

export function stringifyResult(r?: ToolResult): string {
  if (!r) return "(pending)";
  if (r.ok) return typeof r.output === "string" ? r.output : JSON.stringify(r.output);
  return `Error: ${r.error}`;
}

/** A run_bash/run_tests call counts as "failed" on non-zero exit or error. */
export function commandFailed(call: ToolCall, result: ToolResult): boolean {
  if (call.name !== "run_bash" && call.name !== "run_tests") return false;
  if (!result.ok) return true;
  const out = typeof result.output === "string" ? result.output : "";
  const m = /\[exit (\d+)\]/.exec(out);
  return m ? m[1] !== "0" : false;
}
