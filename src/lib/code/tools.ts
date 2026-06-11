// Agent tool surface mirroring Claude Code's primitives.
// All tools operate on the in-memory virtual FS held by useWorkspaceStore.
//
// The agent is told about these tools via JSON Schema. When it emits a tool_call event,
// the client executes the tool and streams back a tool_result.

import { useWorkspaceStore, type Workspace, type WorkspaceFile } from "@/lib/store";
import { runCommand, detectTestCommand } from "@/lib/code/agent-runtime";
import { syncFile, removeFile } from "@/lib/code/webcontainer";
import { useAgentStore, type PlanStep, type PlanStepStatus } from "@/lib/code/agent-store";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "list_dir",
    description: "List file paths in the workspace, optionally filtered by a path prefix.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path prefix, e.g. 'src/' (default: '')." },
      },
    },
  },
  {
    name: "read_file",
    description: "Read the full content of a file by its path.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with the given content. Use for new files OR full rewrites.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace exactly one occurrence of old_str with new_str inside a file. Fails if old_str is missing or appears more than once.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        old_str: { type: "string" },
        new_str: { type: "string" },
      },
      required: ["path", "old_str", "new_str"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file from the workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "glob",
    description: "Find files whose path matches a glob pattern (supports * and **). Returns sorted paths.",
    parameters: {
      type: "object",
      properties: { pattern: { type: "string" } },
      required: ["pattern"],
    },
  },
  {
    name: "grep",
    description: "Search file contents with a regular expression. Returns up to 50 matching lines with file paths.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        path: { type: "string", description: "Optional path prefix to restrict search." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_bash",
    description: "Execute a shell command in the workspace runtime (Node via WebContainer, or Python via Pyodide) and return combined stdout/stderr plus the exit code. Use this to install deps, run scripts, start builds, and verify your work. The command sees your latest file edits.",
    parameters: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
  {
    name: "run_tests",
    description: "Detect and run the project's test command (npm test, or pytest for Python) and report pass/fail with output. Prefer this over run_bash for testing. Returns a non-zero exit code when tests fail so you know to fix and re-run.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_plan",
    description: "Create or update the visible task checklist for this job. Call this first to outline your approach, then call it again to mark steps in_progress/done as you work. Keeps the user oriented.",
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          description: "Ordered list of plan steps.",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              status: { type: "string", enum: ["pending", "in_progress", "done"] },
            },
            required: ["text"],
          },
        },
      },
      required: ["steps"],
    },
  },
  {
    name: "generate_docs",
    description: "Return a README scaffold derived from package.json scripts/dependencies and the file tree. Read it, refine it for this project, then write it with write_file. Read-only — does not write any file itself.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "git",
    description: "Run a git command (init, add, commit, log, diff, status, branch, checkout). Operates on the workspace's WebContainer filesystem. Use run_bash for non-git shell commands.",
    parameters: {
      type: "object",
      properties: {
        args: { type: "string", description: "Arguments to git, e.g. 'init', 'add .', 'commit -m \"initial\"', 'log --oneline -5'" },
      },
      required: ["args"],
    },
  },
];

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type ToolResult =
  | { ok: true; output: unknown }
  | { ok: false; error: string };

/** Tools that mutate the workspace — gated through the approval flow. */
export const MUTATING_TOOLS = new Set(["write_file", "edit_file", "delete_file", "run_bash", "git"]);

export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}

export interface PendingMutation {
  callId: string;
  toolName: string;
  path?: string;
  /** Old content (for diff display) — empty string when creating new file. */
  before: string;
  /** Proposed new content — undefined for delete/run_bash. */
  after?: string;
  /** Command line for run_bash. */
  command?: string;
}

export function previewMutation(workspaceId: string, call: ToolCall): PendingMutation | null {
  const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);
  if (!ws) return null;
  if (call.name === "write_file") {
    const path = call.args.path as string;
    const f = ws.files.find((x) => x.path === path);
    return { callId: call.id, toolName: call.name, path, before: f?.content ?? "", after: call.args.content as string };
  }
  if (call.name === "edit_file") {
    const path = call.args.path as string;
    const oldStr = call.args.old_str as string;
    const newStr = call.args.new_str as string;
    const f = ws.files.find((x) => x.path === path);
    if (!f) return { callId: call.id, toolName: call.name, path, before: "", after: undefined };
    const after = f.content.split(oldStr).length - 1 === 1 ? f.content.replace(oldStr, newStr) : f.content;
    return { callId: call.id, toolName: call.name, path, before: f.content, after };
  }
  if (call.name === "delete_file") {
    const path = call.args.path as string;
    const f = ws.files.find((x) => x.path === path);
    return { callId: call.id, toolName: call.name, path, before: f?.content ?? "" };
  }
  if (call.name === "run_bash") {
    return { callId: call.id, toolName: call.name, before: "", command: call.args.command as string };
  }
  return null;
}

/** Unified diff between two strings — basic LCS-free implementation good enough for UI display. */
export function makeUnifiedDiff(before: string, after: string, path: string): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const out: string[] = [`--- a/${path}`, `+++ b/${path}`];
  const maxLen = Math.max(a.length, b.length);
  let hunkStart = -1;
  let hunkLines: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (a[i] === b[i]) {
      if (hunkStart >= 0) {
        out.push(`@@ -${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("+")).length} +${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("-")).length} @@`);
        out.push(...hunkLines);
        hunkStart = -1;
        hunkLines = [];
      }
      continue;
    }
    if (hunkStart < 0) hunkStart = i;
    if (a[i] !== undefined) hunkLines.push("-" + a[i]);
    if (b[i] !== undefined) hunkLines.push("+" + b[i]);
  }
  if (hunkStart >= 0) {
    out.push(`@@ -${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("+")).length} +${hunkStart + 1},${hunkLines.filter((l) => !l.startsWith("-")).length} @@`);
    out.push(...hunkLines);
  }
  return out.join("\n");
}

function getWorkspace(workspaceId: string): Workspace | undefined {
  return useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);
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

export async function executeTool(
  workspaceId: string,
  call: ToolCall,
  onChunk?: (s: string) => void,
): Promise<ToolResult> {
  const ws = getWorkspace(workspaceId);
  if (!ws) return { ok: false, error: "workspace not found" };
  const store = useWorkspaceStore.getState();

  try {
    switch (call.name) {
      case "list_dir": {
        const prefix = (call.args.path as string) ?? "";
        return { ok: true, output: ws.files.map((f) => f.path).filter((p) => p.startsWith(prefix)).sort() };
      }
      case "read_file": {
        const path = call.args.path as string;
        const f = ws.files.find((x) => x.path === path);
        return f ? { ok: true, output: f.content } : { ok: false, error: `file not found: ${path}` };
      }
      case "write_file": {
        const path = call.args.path as string;
        const content = call.args.content as string;
        store.writeFile(workspaceId, path, content);
        await syncFile(path, content); // mirror into the WebContainer FS so run_bash sees it
        return { ok: true, output: `wrote ${path} (${content.length} bytes)` };
      }
      case "edit_file": {
        const path = call.args.path as string;
        const oldStr = call.args.old_str as string;
        const newStr = call.args.new_str as string;
        const f = ws.files.find((x) => x.path === path);
        if (!f) return { ok: false, error: `file not found: ${path}` };
        const occurrences = f.content.split(oldStr).length - 1;
        if (occurrences === 0) return { ok: false, error: "old_str not found" };
        if (occurrences > 1) return { ok: false, error: `old_str appears ${occurrences} times — make it more specific` };
        const updated = f.content.replace(oldStr, newStr);
        store.writeFile(workspaceId, path, updated);
        await syncFile(path, updated);
        return { ok: true, output: `edited ${path}` };
      }
      case "delete_file": {
        const path = call.args.path as string;
        store.deleteFile(workspaceId, path);
        await removeFile(path);
        return { ok: true, output: `deleted ${path}` };
      }
      case "glob": {
        const pattern = call.args.pattern as string;
        const re = globToRegex(pattern);
        const matches = ws.files.map((f) => f.path).filter((p) => re.test(p)).sort();
        return { ok: true, output: matches };
      }
      case "grep": {
        const pattern = call.args.pattern as string;
        const prefix = (call.args.path as string | undefined) ?? "";
        const re = new RegExp(pattern, "i");
        const hits: Array<{ path: string; line: number; text: string }> = [];
        for (const f of ws.files) {
          if (!f.path.startsWith(prefix)) continue;
          const lines = f.content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              hits.push({ path: f.path, line: i + 1, text: lines[i].slice(0, 200) });
              if (hits.length >= 50) break;
            }
          }
          if (hits.length >= 50) break;
        }
        return { ok: true, output: hits };
      }
      case "run_bash": {
        const command = call.args.command as string;
        const r = await runCommand(workspaceId, command, onChunk);
        return { ok: true, output: `$ ${command}\n${r.output}\n[exit ${r.exitCode}]` };
      }
      case "run_tests": {
        const cmd = detectTestCommand(ws);
        if (!cmd) {
          return { ok: false, error: "No test command found. Add a 'test' script to package.json or create test_*.py files, then retry." };
        }
        const r = await runCommand(workspaceId, cmd, onChunk);
        return { ok: true, output: `$ ${cmd}\n${r.output}\n[exit ${r.exitCode}]` };
      }
      case "update_plan": {
        const raw = (call.args.steps ?? call.args.plan ?? []) as Array<{ text?: string; step?: string; status?: string }>;
        const steps: PlanStep[] = raw
          .map((s) => ({
            id: crypto.randomUUID(),
            text: String(s.text ?? s.step ?? "").slice(0, 240),
            status: (s.status === "done" || s.status === "in_progress" ? s.status : "pending") as PlanStepStatus,
          }))
          .filter((s) => s.text);
        useAgentStore.getState().setPlan(workspaceId, steps);
        return { ok: true, output: `plan updated — ${steps.length} step${steps.length === 1 ? "" : "s"}` };
      }
      case "generate_docs": {
        return { ok: true, output: buildReadmeScaffold(ws) };
      }
      case "git": {
        const args = (call.args.args as string) ?? "";
        const ALLOWED = /^(init|add|commit|log|diff|status|branch|checkout|show|tag|remote|config)\b/;
        if (!ALLOWED.test(args.trim())) {
          return { ok: false, error: `git: only safe read/commit commands are allowed. Blocked: git ${args}` };
        }
        const r = await runCommand(workspaceId, `git ${args}`, onChunk);
        return { ok: true, output: `$ git ${args}\n${r.output}\n[exit ${r.exitCode}]` };
      }
      default:
        return { ok: false, error: `unknown tool: ${call.name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "tool execution failed" };
  }
}

export function workspaceSummary(ws: Workspace): string {
  const tree = ws.files.map((f) => `  ${f.path} (${f.content.split("\n").length} lines)`).join("\n");
  return `Workspace "${ws.name}" (${ws.runtime}):\n${tree || "  (empty)"}`;
}

/** Build a README skeleton from package.json scripts/deps + file tree (used by generate_docs). */
export function buildReadmeScaffold(ws: Workspace): string {
  const pkg = ws.files.find((f) => f.path === "package.json");
  let name = ws.name;
  let scripts: Record<string, string> = {};
  let deps: string[] = [];
  if (pkg) {
    try {
      const p = JSON.parse(pkg.content) as { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string> };
      if (p.name) name = p.name;
      scripts = p.scripts ?? {};
      deps = Object.keys(p.dependencies ?? {});
    } catch { /* ignore malformed package.json */ }
  }
  const scriptLines = Object.entries(scripts).map(([k, v]) => `- \`npm run ${k}\` — ${v}`).join("\n") || "- _(no scripts defined)_";
  const tree = ws.files.map((f) => `- \`${f.path}\``).slice(0, 40).join("\n");
  const runHint = ws.runtime === "python"
    ? "python main.py"
    : scripts.dev ? "npm install && npm run dev"
    : scripts.start ? "npm install && npm start"
    : "npm install";
  return `# ${name}

> One-line description of what this project does. _(replace me)_

## Overview

Describe the purpose, key features, and intended audience. _(replace me)_

## Getting started

\`\`\`bash
${runHint}
\`\`\`

## Scripts

${scriptLines}

${deps.length ? `## Dependencies\n\n${deps.map((d) => `- ${d}`).join("\n")}\n\n` : ""}## Project structure

${tree}

## License

MIT _(replace me)_
`;
}

export const WORKSPACE_TEMPLATES: Array<{
  name: string;
  description: string;
  runtime: Workspace["runtime"];
  files: WorkspaceFile[];
}> = [
  {
    name: "Empty Node",
    description: "Blank Node workspace with package.json",
    runtime: "node",
    files: [
      { path: "package.json", content: JSON.stringify({ name: "my-app", version: "0.0.1", type: "module" }, null, 2), updatedAt: Date.now() },
      { path: "index.js", content: 'console.log("hello, world");\n', updatedAt: Date.now() },
    ],
  },
  {
    name: "Vite + React",
    description: "React + Vite starter",
    runtime: "node",
    files: [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: "vite-react",
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
            dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
            devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.0" },
          },
          null,
          2,
        ),
        updatedAt: Date.now(),
      },
      { path: "index.html", content: '<!doctype html>\n<html><body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body></html>\n', updatedAt: Date.now() },
      { path: "src/main.jsx", content: 'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\n\ncreateRoot(document.getElementById("root")).render(<App />);\n', updatedAt: Date.now() },
      { path: "src/App.jsx", content: 'export default function App() {\n  return <h1>Hello Vite + React</h1>;\n}\n', updatedAt: Date.now() },
    ],
  },
  {
    name: "Python script",
    description: "Single-file Python script",
    runtime: "python",
    files: [
      { path: "main.py", content: 'def main():\n    print("hello from python")\n    return sum(range(100))\n\nif __name__ == "__main__":\n    main()\n', updatedAt: Date.now() },
    ],
  },
  {
    name: "Static HTML",
    description: "Plain HTML/CSS/JS",
    runtime: "static",
    files: [
      { path: "index.html", content: '<!doctype html>\n<html>\n<head><title>My page</title><link rel="stylesheet" href="style.css"></head>\n<body><h1>Hello!</h1><script src="app.js"></script></body>\n</html>\n', updatedAt: Date.now() },
      { path: "style.css", content: "body { font-family: system-ui; padding: 2rem; }\n", updatedAt: Date.now() },
      { path: "app.js", content: 'console.log("hi");\n', updatedAt: Date.now() },
    ],
  },
  {
    name: "Next.js",
    description: "Next 15 App Router starter",
    runtime: "node",
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "next-app",
          private: true,
          version: "0.0.1",
          scripts: { dev: "next dev", build: "next build", start: "next start" },
          dependencies: { next: "^15.1.3", react: "^19.0.0", "react-dom": "^19.0.0" },
        }, null, 2),
        updatedAt: Date.now(),
      },
      { path: "next.config.mjs", content: "export default { reactStrictMode: true };\n", updatedAt: Date.now() },
      { path: "app/layout.jsx", content: 'export default function RootLayout({ children }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n', updatedAt: Date.now() },
      { path: "app/page.jsx", content: 'export default function Home() {\n  return <main style={{ padding: 32 }}><h1>Hello Next.js</h1></main>;\n}\n', updatedAt: Date.now() },
    ],
  },
  {
    name: "FastAPI",
    description: "Python FastAPI starter (Pyodide demo — no server)",
    runtime: "python",
    files: [
      {
        path: "main.py",
        content: '# FastAPI in browser via Pyodide is read-only — but you can model the routes\n# and run unit tests. Export to GitHub for a real Codespaces deploy.\n\nfrom dataclasses import dataclass\n\n@dataclass\nclass Item:\n    id: int\n    name: str\n\nITEMS = [Item(1, "first"), Item(2, "second")]\n\ndef list_items():\n    return [{"id": i.id, "name": i.name} for i in ITEMS]\n\nif __name__ == "__main__":\n    print(list_items())\n',
        updatedAt: Date.now(),
      },
      {
        path: "requirements.txt",
        content: "fastapi>=0.115\nuvicorn>=0.30\npydantic>=2.0\n",
        updatedAt: Date.now(),
      },
      {
        path: "README.md",
        content: "# FastAPI starter\n\nRun locally with `uvicorn main:app --reload` after exporting.\n",
        updatedAt: Date.now(),
      },
    ],
  },
  {
    name: "HF Transformers",
    description: "Hugging Face transformers.js in-browser inference",
    runtime: "node",
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "transformers-demo",
          private: true,
          version: "0.0.1",
          type: "module",
          scripts: { dev: "vite", build: "vite build" },
          dependencies: { "@huggingface/transformers": "^3.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.0" },
        }, null, 2),
        updatedAt: Date.now(),
      },
      { path: "index.html", content: '<!doctype html>\n<html><body>\n<div id="root"></div>\n<script type="module" src="/src/main.jsx"></script>\n</body></html>\n', updatedAt: Date.now() },
      {
        path: "src/main.jsx",
        content: 'import React, { useState } from "react";\nimport { createRoot } from "react-dom/client";\nimport { pipeline } from "@huggingface/transformers";\n\nfunction App() {\n  const [text, setText] = useState("I love this product");\n  const [result, setResult] = useState(null);\n  async function classify() {\n    const pipe = await pipeline("sentiment-analysis");\n    setResult(await pipe(text));\n  }\n  return (\n    <div style={{ padding: 32, fontFamily: "system-ui" }}>\n      <h1>HF Transformers.js</h1>\n      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} cols={50} />\n      <br />\n      <button onClick={classify}>Classify</button>\n      <pre>{JSON.stringify(result, null, 2)}</pre>\n    </div>\n  );\n}\n\ncreateRoot(document.getElementById("root")).render(<App />);\n',
        updatedAt: Date.now(),
      },
    ],
  },
];
