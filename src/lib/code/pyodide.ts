"use client";

// Pyodide singleton loader. Lazy-imported via CDN since the package is too large for the main bundle.

interface PyodideAPI {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { set: (k: string, v: unknown) => void };
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
}

let bootPromise: Promise<PyodideAPI> | null = null;
let booted: PyodideAPI | null = null;
let stdoutHandler: ((s: string) => void) | null = null;
let stderrHandler: ((s: string) => void) | null = null;

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL?: string }) => Promise<PyodideAPI>;
  }
}

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Pyodide"));
    document.head.appendChild(s);
  });
}

export async function bootPyodide(onOutput?: { stdout?: (s: string) => void; stderr?: (s: string) => void }): Promise<PyodideAPI> {
  if (onOutput?.stdout) stdoutHandler = onOutput.stdout;
  if (onOutput?.stderr) stderrHandler = onOutput.stderr;
  if (booted) return booted;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    await loadScript(`${PYODIDE_CDN}pyodide.js`);
    if (!window.loadPyodide) throw new Error("Pyodide didn't expose loadPyodide");
    const py = await window.loadPyodide({ indexURL: PYODIDE_CDN });
    py.setStdout({ batched: (s: string) => stdoutHandler?.(s) });
    py.setStderr({ batched: (s: string) => stderrHandler?.(s) });
    booted = py;
    return py;
  })();
  return bootPromise;
}

export async function runPython(code: string, onOutput?: { stdout?: (s: string) => void; stderr?: (s: string) => void }): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    const py = await bootPyodide(onOutput);
    const result = await py.runPythonAsync(code);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Python failed" };
  }
}

export function isPyodideBooted(): boolean {
  return booted !== null;
}
