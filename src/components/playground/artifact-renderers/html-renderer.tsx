"use client";

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";
import { stripWrappingCodeFence } from "@/lib/artifacts";

export interface ConsoleEntry {
  level: "log" | "info" | "warn" | "error";
  text: string;
  ts: number;
}

interface Props {
  content: string;
  /** When true, body content is wrapped into a minimal HTML document. */
  wrap?: boolean;
  /** Changing this remounts the iframe — used by the panel's Reload button. */
  reloadKey?: number;
  /** Receives console output + runtime errors from inside the sandbox. */
  onConsole?: (entry: ConsoleEntry) => void;
  /** Inject the Tailwind Play CDN so utility classes render (Claude-style). Default true. */
  injectTailwind?: boolean;
}

const TAILWIND = `<script src="https://cdn.tailwindcss.com"><\/script>`;

function buildSrcDoc(rawContent: string, wrap: boolean | undefined, injectTailwind: boolean): string {
  // Defensive: strip a wrapping ```html fence if the model nested one inside <artifact>.
  const content = stripWrappingCodeFence(rawContent).content;
  const looksLikeDoc = /<!DOCTYPE|<html[\s>]/i.test(content);
  const hasTailwind = /tailwindcss|cdn\.tailwindcss|@tailwind/i.test(content);
  const head = CONSOLE_BRIDGE + (injectTailwind && !hasTailwind ? TAILWIND : "");

  if (looksLikeDoc) {
    // Inject the bridge (+Tailwind) right after <head>, or before </head>, falling back to prepend.
    if (/<head[^>]*>/i.test(content)) return content.replace(/<head[^>]*>/i, (m) => m + head);
    if (/<html[^>]*>/i.test(content)) return content.replace(/<html[^>]*>/i, (m) => m + "<head>" + head + "</head>");
    return head + content;
  }
  if (!wrap) return head + content;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${head}<style>html,body{margin:0;padding:16px;font-family:system-ui,sans-serif;color:#111}body{background:#fff}</style></head><body>${content}</body></html>`;
}

/**
 * Renders HTML inside a sandboxed iframe via srcdoc. The `sandbox` attribute omits
 * "allow-same-origin", so scripts cannot reach the parent window, cookies, or
 * storage — safe for untrusted output. A bridge script forwards console + errors
 * to the parent via postMessage, and Tailwind is injected so generated UIs look styled.
 */
export function HtmlRenderer({ content, wrap, reloadKey = 0, injectTailwind = true }: Props) {
  const srcdoc = useMemo(
    () => buildSrcDoc(content, wrap, injectTailwind),
    [content, wrap, injectTailwind],
  );

  return (
    <iframe
      key={reloadKey}
      title="HTML artifact preview"
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      className="w-full h-full border-0 bg-white"
    />
  );
}
