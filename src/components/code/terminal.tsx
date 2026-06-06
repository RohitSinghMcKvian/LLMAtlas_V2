"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useWorkspaceStore, type WorkspaceRuntime } from "@/lib/store";
import {
  isCrossOriginIsolated, mountWorkspace, spawnShell, getPreviewUrl, onPreviewUrl,
} from "@/lib/code/webcontainer";
import { runPython } from "@/lib/code/pyodide";

interface Props {
  workspaceId: string;
  onPreviewUrlChange?: (url: string | null) => void;
}

interface XTermLike {
  open: (el: HTMLElement) => void;
  write: (s: string) => void;
  onData: (cb: (d: string) => void) => void;
  dispose: () => void;
  loadAddon: (a: unknown) => void;
}

export function Terminal({ workspaceId, onPreviewUrlChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTermLike | null>(null);
  const workspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const [booting, setBooting] = useState(false);
  const [ready, setReady] = useState(false);
  const runtime: WorkspaceRuntime = workspace?.runtime ?? "node";

  useEffect(() => {
    let disposed = false;
    let term: XTermLike | null = null;
    let cleanupUrl: (() => void) | null = null;
    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;
      term = new XTerm({
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 12,
        theme: { background: "#0c0c0c", foreground: "#d4d4d4", cursor: "#a78bfa" },
        cursorBlink: true,
        convertEol: true,
      }) as unknown as XTermLike;
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      try { (fit as unknown as { fit: () => void }).fit(); } catch {}
      termRef.current = term;

      const write = (s: string) => term?.write(s);
      write("\x1b[38;5;141m✦ Playground Code terminal\x1b[0m\r\n");

      if (runtime === "node") {
        if (!isCrossOriginIsolated()) {
          write("\x1b[38;5;203m! Cross-origin isolation not active.\x1b[0m\r\n");
          write("  Reload /code so the page picks up COOP/COEP headers.\r\n$ ");
        } else {
          write("\x1b[38;5;245mBooting Node WebContainer…\x1b[0m\r\n");
          setBooting(true);
          try {
            await mountWorkspace(workspaceId, workspace?.files ?? []);
            if (disposed) return;
            cleanupUrl = onPreviewUrl((url) => { onPreviewUrlChange?.(url); if (url) write(`\r\n\x1b[38;5;120m▸ Preview ready:\x1b[0m ${url}\r\n$ `); });
            const cached = getPreviewUrl();
            if (cached) onPreviewUrlChange?.(cached);
            write("\x1b[38;5;120mReady.\x1b[0m Type a command, or run \x1b[38;5;141mnpm install && npm run dev\x1b[0m to start the dev server.\r\n$ ");
            setReady(true);
          } catch (e) {
            write(`\x1b[38;5;203m✕ ${e instanceof Error ? e.message : String(e)}\x1b[0m\r\n$ `);
          } finally {
            setBooting(false);
          }
        }
      } else if (runtime === "python") {
        write("\x1b[38;5;245mPython runtime: Pyodide (boots on first \`python …\` run)\x1b[0m\r\n");
        write("\x1b[38;5;245mTry: \x1b[38;5;141mpython main.py\x1b[0m\r\n$ ");
        setReady(true);
      } else {
        write("\x1b[38;5;245mStatic workspace — open Preview to see your page.\x1b[0m\r\n$ ");
        setReady(true);
      }

      let buf = "";
      term.onData(async (d) => {
        if (d === "\r") {
          term?.write("\r\n");
          const line = buf.trim();
          buf = "";
          if (!line) { term?.write("$ "); return; }
          await runCommand(line, write, runtime, workspaceId);
          term?.write("$ ");
        } else if (d === "" || d === "\b") {
          if (buf.length) { buf = buf.slice(0, -1); term?.write("\b \b"); }
        } else if (d >= " " && d <= "~") {
          buf += d;
          term?.write(d);
        }
      });

      const onResize = () => { try { (fit as unknown as { fit: () => void }).fit(); } catch {} };
      window.addEventListener("resize", onResize);
      (term as unknown as { _resizeCleanup?: () => void })._resizeCleanup = () => window.removeEventListener("resize", onResize);
    })();
    return () => {
      disposed = true;
      try {
        (term as unknown as { _resizeCleanup?: () => void } | null)?._resizeCleanup?.();
        term?.dispose();
        cleanupUrl?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, runtime]);

  return (
    <div className="relative h-full w-full bg-[#0c0c0c]">
      {booting && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-amber-400 bg-black/60 rounded px-2 py-1 z-10">
          <Loader2 className="h-3 w-3 animate-spin" />
          booting…
        </div>
      )}
      {ready && runtime === "node" && (
        <button
          onClick={() => quickRun(workspaceId)}
          className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white rounded px-2 py-1 z-10"
          title="npm install && npm run dev"
        >
          <Play className="h-3 w-3" /> Run
        </button>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

async function runCommand(line: string, write: (s: string) => void, runtime: WorkspaceRuntime, workspaceId: string) {
  if (runtime === "node") {
    try {
      const proc = await spawnShell(line, write);
      const code = await proc.exit;
      if (code !== 0) write(`\r\n\x1b[38;5;203m[exit ${code}]\x1b[0m\r\n`);
    } catch (e) {
      write(`\x1b[38;5;203m✕ ${e instanceof Error ? e.message : String(e)}\x1b[0m\r\n`);
    }
  } else if (runtime === "python") {
    if (/^python\s+(.+)$/.test(line)) {
      const path = line.replace(/^python\s+/, "").trim();
      const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);
      const file = ws?.files.find((f) => f.path === path);
      if (!file) { write(`\x1b[38;5;203mNo such file: ${path}\x1b[0m\r\n`); return; }
      write("\x1b[38;5;245m(loading Pyodide on first run, ~5s)\x1b[0m\r\n");
      const r = await runPython(file.content, {
        stdout: (s) => write(s + "\r\n"),
        stderr: (s) => write(`\x1b[38;5;203m${s}\x1b[0m\r\n`),
      });
      if (!r.ok) write(`\x1b[38;5;203m✕ ${r.error}\x1b[0m\r\n`);
    } else if (line.startsWith("print(") || /^\w+\s*=/.test(line) || line.includes("import ")) {
      const r = await runPython(line, {
        stdout: (s) => write(s + "\r\n"),
        stderr: (s) => write(`\x1b[38;5;203m${s}\x1b[0m\r\n`),
      });
      if (!r.ok) write(`\x1b[38;5;203m✕ ${r.error}\x1b[0m\r\n`);
    } else {
      write(`\x1b[38;5;245m[python only]\x1b[0m unknown command: ${line}\r\n`);
    }
  } else {
    write(`\x1b[38;5;245m[static]\x1b[0m no shell — edit files and use Preview.\r\n`);
  }
}

async function quickRun(workspaceId: string) {
  const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId);
  if (!ws) return;
  // Determine a sensible default command from package.json if present.
  const pkg = ws.files.find((f) => f.path === "package.json");
  let cmd = "npm install && npm run dev";
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content) as { scripts?: Record<string, string> };
      if (parsed.scripts?.dev) cmd = "npm install && npm run dev";
      else if (parsed.scripts?.start) cmd = "npm install && npm run start";
    } catch {}
  }
  // Send via xterm-input would be ideal — for now use spawnShell directly.
  // The terminal will not show typed input, but output streams through the write fn the next time the user opens a fresh term session.
  await spawnShell(cmd, () => {});
}
