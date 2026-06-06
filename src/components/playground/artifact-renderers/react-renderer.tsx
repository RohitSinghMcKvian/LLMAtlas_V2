"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildReactSrcdoc } from "./build-react-srcdoc";

interface Props {
  content: string;
  language?: string;
  reloadKey?: number;
}

/**
 * Live React/JSX/TSX artifact preview rendered in a sandboxed iframe using an
 * esm.sh importmap + Babel Standalone + Tailwind (the Claude-Artifacts approach).
 * Self-contained: any imported npm package auto-resolves via esm.sh.
 *
 * The srcdoc rebuild is debounced so live-streaming content doesn't reload the
 * iframe on every token.
 */
export function ReactRenderer({ content, reloadKey = 0 }: Props) {
  const [debounced, setDebounced] = useState(content);
  const [loading, setLoading] = useState(true);

  // Debounce content → srcdoc rebuild (avoids thrashing while an artifact streams in).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(content), 450);
    return () => clearTimeout(t);
  }, [content]);

  const srcdoc = useMemo(() => buildReactSrcdoc(debounced), [debounced]);

  // Show the spinner whenever we (re)build or reload, until the sandbox signals ready.
  useEffect(() => { setLoading(true); }, [srcdoc, reloadKey]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && e.data.__llmatlas_artifact_ready) setLoading(false);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div className="relative h-full w-full bg-white">
      <iframe
        key={reloadKey}
        title="React artifact preview"
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-popups allow-modals allow-forms"
        className="h-full w-full border-0 bg-white"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 text-sm text-slate-500 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running…
        </div>
      )}
    </div>
  );
}
