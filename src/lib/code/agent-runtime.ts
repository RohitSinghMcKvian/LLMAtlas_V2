"use client";

// Real command execution for the agent. Routes shell commands to the WebContainer
// (Node workspaces) or Pyodide (Python workspaces), captures combined stdout/stderr,
// and returns an exit code. This is what turns the agent from a code *writer* into a
// code *runner* that can test and self-heal.

import { useWorkspaceStore, type Workspace } from "@/lib/store";
import {
  isCrossOriginIsolated, mountWorkspace, syncWorkspaceToContainer, spawnShell,
} from "@/lib/code/webcontainer";
import { runPython } from "@/lib/code/pyodide";

/** Hard ceiling on captured output so a chatty command can't blow the token budget. */
const MAX_OUTPUT = 12_000;
/** Kill a command that runs longer than this (e.g. a hung dev server in a test). */
const DEFAULT_TIMEOUT_MS = 120_000;

export interface RunResult {
  output: string;
  exitCode: number;
  truncated: boolean;
}

function truncateTail(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_OUTPUT) return { text: s, truncated: false };
  return { text: `…(${s.length - MAX_OUTPUT} chars truncated)…\n` + s.slice(s.length - MAX_OUTPUT), truncated: true };
}

function withTimeout(p: Promise<number>, ms: number, onTimeout: () => void): Promise<number> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (done) return; done = true; onTimeout(); resolve(124); }, ms);
    p.then((v) => { if (done) return; done = true; clearTimeout(t); resolve(v); })
      .catch(() => { if (done) return; done = true; clearTimeout(t); resolve(1); });
  });
}

/** Execute a shell command in the workspace's runtime and return captured output + exit code. */
export async function runCommand(
  workspaceId: string,
  command: string,
  onChunk?: (s: string) => void,
): Promise<RunResult> {
  const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);
  if (!ws) return { output: "workspace not found", exitCode: 1, truncated: false };

  if (ws.runtime === "node") {
    if (!isCrossOriginIsolated()) {
      return {
        output: "Cross-origin isolation is not active — reload /code so COOP/COEP headers apply, then retry.",
        exitCode: 1, truncated: false,
      };
    }
    await mountWorkspace(workspaceId, ws.files);
    await syncWorkspaceToContainer(ws.files); // agent edits the in-memory store; mirror them in first
    let buf = "";
    const proc = await spawnShell(command, (chunk) => { buf += chunk; onChunk?.(chunk); });
    const exitCode = await withTimeout(proc.exit, DEFAULT_TIMEOUT_MS, () => proc.kill());
    if (exitCode === 124) buf += `\n[timed out after ${Math.round(DEFAULT_TIMEOUT_MS / 1000)}s — process killed]`;
    const { text, truncated } = truncateTail(buf);
    return { output: text || "(no output)", exitCode, truncated };
  }

  if (ws.runtime === "python") {
    return runPythonCommand(ws, command, onChunk);
  }

  return {
    output: "This is a static workspace (no shell). Edit HTML/CSS/JS with write_file and open the Preview pane to see results.",
    exitCode: 1, truncated: false,
  };
}

/** Pyodide path: supports `python <file>`, inline snippets, and a lightweight pytest. */
async function runPythonCommand(ws: Workspace, command: string, onChunk?: (s: string) => void): Promise<RunResult> {
  const trimmed = command.trim();
  const collect = (acc: { buf: string }) => ({
    stdout: (s: string) => { acc.buf += s + "\n"; onChunk?.(s + "\n"); },
    stderr: (s: string) => { acc.buf += s + "\n"; onChunk?.(s + "\n"); },
  });

  if (/^(?:python\s+-m\s+)?pytest\b/.test(trimmed) || trimmed === "pytest") {
    return runPytestLite(ws, onChunk);
  }

  let code: string;
  const fileMatch = /^(?:python3?|py)\s+(\S+)/.exec(trimmed);
  if (fileMatch) {
    const file = ws.files.find((f) => f.path === fileMatch[1]);
    if (!file) return { output: `python: can't open file '${fileMatch[1]}': No such file`, exitCode: 2, truncated: false };
    code = preludeWriteFiles(ws) + file.content;
  } else if (trimmed.includes("\n") || /\b(import|print|def|=)\b/.test(trimmed)) {
    code = preludeWriteFiles(ws) + command;
  } else {
    return {
      output: `Pyodide runtime: supported forms are \`python <file>\`, inline Python snippets, and \`pytest\`. Unknown: ${command}`,
      exitCode: 127, truncated: false,
    };
  }

  const acc = { buf: "" };
  const r = await runPython(code, collect(acc));
  if (!r.ok) { acc.buf += (r.error ?? "Python error") + "\n"; onChunk?.((r.error ?? "Python error") + "\n"); }
  const { text, truncated } = truncateTail(acc.buf);
  return { output: text || "(no output)", exitCode: r.ok ? 0 : 1, truncated };
}

/** Materialize all workspace files into Pyodide's in-memory FS so `import <module>` works. */
function preludeWriteFiles(ws: Workspace): string {
  const map = Object.fromEntries(ws.files.map((f) => [f.path, f.content]));
  return `import os as __os, sys as __sys
__files = ${JSON.stringify(map)}
for __p, __c in __files.items():
    __d = __os.path.dirname(__p)
    if __d:
        __os.makedirs(__d, exist_ok=True)
    with open(__p, "w") as __fh:
        __fh.write(__c)
if "." not in __sys.path:
    __sys.path.insert(0, ".")
del __files, __p, __c, __d, __fh
`;
}

/** Minimal pytest: discovers test_*.py / *_test.py files and runs their test_* functions. */
async function runPytestLite(ws: Workspace, onChunk?: (s: string) => void): Promise<RunResult> {
  const testFiles = ws.files.filter((f) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(f.path));
  if (!testFiles.length) return { output: "No test_*.py or *_test.py files found.", exitCode: 5, truncated: false };

  const harness = `${preludeWriteFiles(ws)}
import traceback as __tb, importlib.util as __ilu
__test_files = ${JSON.stringify(testFiles.map((f) => f.path))}
__passed = 0
__failed = 0
__failures = []
for __tf in __test_files:
    __ns = {}
    try:
        exec(compile(open(__tf).read(), __tf, "exec"), __ns)
    except Exception:
        __failed += 1
        __failures.append((__tf, "<module>", __tb.format_exc()))
        print(f"FAIL {__tf}::<module import>")
        continue
    for __name, __fn in list(__ns.items()):
        if __name.startswith("test_") and callable(__fn):
            try:
                __fn()
                __passed += 1
                print(f"PASS {__tf}::{__name}")
            except Exception:
                __failed += 1
                __failures.append((__tf, __name, __tb.format_exc()))
                print(f"FAIL {__tf}::{__name}")
print("")
for __tf, __n, __trace in __failures:
    print(f"----- {__tf}::{__n} -----")
    print(__trace)
print(f"=== {__passed} passed, {__failed} failed ===")
`;
  const acc = { buf: "" };
  const r = await runPython(harness, {
    stdout: (s) => { acc.buf += s + "\n"; onChunk?.(s + "\n"); },
    stderr: (s) => { acc.buf += s + "\n"; onChunk?.(s + "\n"); },
  });
  if (!r.ok) acc.buf += (r.error ?? "harness error") + "\n";
  const exitCode = !r.ok || /[1-9]\d* failed/.test(acc.buf) ? 1 : 0;
  const { text, truncated } = truncateTail(acc.buf);
  return { output: text || "(no output)", exitCode, truncated };
}

/** Detect the canonical test command for a workspace, or null if none is configured. */
export function detectTestCommand(ws: Workspace): string | null {
  if (ws.runtime === "python") {
    return ws.files.some((f) => /(^|\/)(test_[^/]*|[^/]*_test)\.py$/.test(f.path)) ? "pytest" : null;
  }
  const pkg = ws.files.find((f) => f.path === "package.json");
  if (!pkg) return null;
  try {
    const parsed = JSON.parse(pkg.content) as { scripts?: Record<string, string> };
    if (parsed.scripts?.test) return "npm test";
  } catch { /* ignore malformed package.json */ }
  return null;
}
