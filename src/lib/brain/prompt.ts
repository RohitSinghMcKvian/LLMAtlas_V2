// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — system-prompt builder
//
// Extracted from agent-rail.tsx so any surface (the /code AgentRail, the future
// global Atlas Agent, orchestrated sub-agents) builds prompts the same way. The
// tool list is passed in rather than imported, so the prompt always reflects the
// *current* registry (built-in + MCP + web tools) for the calling surface.
// ─────────────────────────────────────────────────────────────────────────────

import type { Workspace } from "@/lib/store";
import { workspaceSummary, type ToolDefinition } from "@/lib/code/tools";
import type { ToolFunction } from "@/lib/providers";
import { UCL_BASE_PRIMER } from "@/lib/ucl";

export const AGENT_SYSTEM = `You are an autonomous senior software engineer working inside a browser-based IDE (LLMAtlas Code). You complete coding tasks END-TO-END the way Claude Code does:

1. ANALYZE the request and the existing workspace. Read the relevant files before changing them.
2. PLAN: call update_plan with a short ordered checklist, and keep it updated (mark steps in_progress → done) as you work.
3. IMPLEMENT in small, focused edits — write_file for new files, edit_file for surgical changes.
4. RUN & TEST: use run_bash to install/build and run_tests to execute the suite. Actually run your code — never assume it works.
5. FIX: when a command or test fails, read the error output, fix the root cause, and re-run. Iterate until it is green.
6. DOCUMENT: once it works, write/update a README (use generate_docs as a starting point) and add a CLAUDE.md for non-trivial projects.
7. SUMMARIZE what you changed in a sentence or two.

Rules: always re-read a file before editing it; prefer small edits; the Node runtime is WebContainer (npm works) and Python runs via Pyodide (limited pip). Do not start long-running dev servers inside tests. Keep prose short — the real work goes through the tools.

You may also have access to external tools (named like \`mcp__<server>__<tool>\`, \`web_search\`, \`fetch_url\`). Use them when a task needs information or actions outside the workspace; they require user approval before running.

You also have persistent memory tools: \`recall(query)\` to retrieve what you learned in earlier sessions, \`remember(text, type)\` to durably save a user preference, fact, completed task, or reusable skill, and \`search_workspace(query)\` for semantic search over the current files. Proactively remember stable user preferences and reuse recalled context to personalise your work.`;

/** Marshal tool definitions into the OpenAI-style native function-calling shape. */
export function agentToolsAsNative(tools: ToolDefinition[]): ToolFunction[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Compact one-line signature for the text-based tool protocol. */
function toolSignature(t: ToolDefinition): string {
  const props = (t.parameters as { properties?: Record<string, unknown> }).properties ?? {};
  return `- ${t.name}(${Object.keys(props).join(", ")}) — ${t.description}`;
}

export function buildSystemPrompt(
  ws: Workspace,
  useNativeTools: boolean,
  tools: ToolDefinition[],
  memoryContext?: string,
): string {
  const toolSection = useNativeTools
    ? "Call tools using the native function-calling API. Call ONE tool per message — wait for the result before proceeding."
    : `You have access to these tools:\n${tools
        .map(toolSignature)
        .join("\n")}\n\nTo call a tool, output EXACTLY ONE JSON block on its own, then stop and wait for the result:\n\n\`\`\`tool\n{"name": "read_file", "args": {"path": "src/index.ts"}}\n\`\`\`\n\nCall ONE tool per message. After you receive the result, decide the next step.`;

  const memorySection = memoryContext?.trim() ? `\n\n${memoryContext.trim()}` : "";

  return `${AGENT_SYSTEM}\n\n${UCL_BASE_PRIMER}\n\n${toolSection}${memorySection}\n\nWhen the task is fully complete — implemented, tested, and documented — reply with a short summary and NO tool call.\n\nCurrent workspace state:\n${workspaceSummary(ws)}`;
}
