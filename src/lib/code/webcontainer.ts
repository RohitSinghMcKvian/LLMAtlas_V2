"use client";

// WebContainer singleton. Boots once per page load, mounts the active workspace,
// and runs shell commands with stdout/stderr piped to a callback.
//
// Requires cross-origin isolation (COOP same-origin + COEP require-corp).
// Configured in next.config.ts for /code only.

import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import type { WorkspaceFile } from "@/lib/store";

let bootPromise: Promise<WebContainer> | null = null;
let booted: WebContainer | null = null;
let mountedWorkspaceId: string | null = null;
let lastUrl: string | null = null;
let urlListeners: Array<(url: string | null) => void> = [];

export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return (window as Window & { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
}

export async function bootWebContainer(): Promise<WebContainer> {
  if (booted) return booted;
  if (bootPromise) return bootPromise;
  if (!isCrossOriginIsolated()) {
    throw new Error("WebContainer requires cross-origin isolation (COOP/COEP). Reload /code.");
  }
  bootPromise = (async () => {
    const { WebContainer } = await import("@webcontainer/api");
    const wc = await WebContainer.boot();
    booted = wc;
    wc.on("server-ready", (_port, url) => {
      lastUrl = url;
      urlListeners.forEach((l) => l(url));
    });
    return wc;
  })();
  return bootPromise;
}

export function getPreviewUrl(): string | null {
  return lastUrl;
}

export function onPreviewUrl(listener: (url: string | null) => void): () => void {
  urlListeners.push(listener);
  return () => {
    urlListeners = urlListeners.filter((l) => l !== listener);
  };
}

/** Convert flat workspace files into the nested FileSystemTree WebContainer expects. */
function filesToTree(files: WorkspaceFile[]): FileSystemTree {
  const root: FileSystemTree = {};
  for (const f of files) {
    const parts = f.path.split("/");
    let node: FileSystemTree = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        (node as Record<string, { file: { contents: string } }>)[part] = { file: { contents: f.content } };
      } else {
        const next = (node[part] as { directory: FileSystemTree } | undefined) ?? { directory: {} };
        node[part] = next;
        node = next.directory;
      }
    }
  }
  return root;
}

/** Mount (or remount on workspace switch) the workspace files. */
export async function mountWorkspace(workspaceId: string, files: WorkspaceFile[]): Promise<WebContainer> {
  const wc = await bootWebContainer();
  if (mountedWorkspaceId !== workspaceId) {
    await wc.mount(filesToTree(files));
    mountedWorkspaceId = workspaceId;
  }
  return wc;
}

/** Sync a single file from the editor into the WebContainer FS. */
export async function syncFile(path: string, content: string): Promise<void> {
  if (!booted) return;
  // Ensure parent dirs exist.
  const segments = path.split("/");
  if (segments.length > 1) {
    const dir = segments.slice(0, -1).join("/");
    try { await booted.fs.mkdir(dir, { recursive: true }); } catch {}
  }
  await booted.fs.writeFile(path, content);
}

export interface SpawnResult {
  exit: Promise<number>;
  kill: () => void;
}

/** Spawn a command and pipe stdout to onChunk. Returns exit code via .exit. */
export async function spawnCommand(
  command: string,
  args: string[],
  onChunk: (chunk: string) => void,
): Promise<SpawnResult> {
  if (!booted) throw new Error("WebContainer not booted");
  const proc = await booted.spawn(command, args);
  proc.output.pipeTo(new WritableStream({ write(chunk) { onChunk(chunk); } }));
  return {
    exit: proc.exit,
    kill: () => proc.kill(),
  };
}

/** Convenience: spawn a shell command line. */
export async function spawnShell(line: string, onChunk: (chunk: string) => void): Promise<SpawnResult> {
  return spawnCommand("jsh", ["-c", line], onChunk);
}
