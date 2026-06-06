"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  content: string;
  reloadKey?: number;
}

interface MermaidModule {
  default: {
    initialize: (cfg: Record<string, unknown>) => void;
    render: (id: string, src: string) => Promise<{ svg: string }>;
  };
}

/**
 * Mermaid diagram renderer with theme-aware styling and pan/zoom controls.
 * Loaded dynamically so the dep is optional — degrades to a source preview if absent.
 */
export function MermaidRenderer({ content, reloadKey = 0 }: Props) {
  const { resolvedTheme } = useTheme();
  const id = useMemo(() => `m-${Math.random().toString(36).slice(2, 9)}`, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const specifier = "mermaid";
        const mod = (await import(/* webpackIgnore: true */ specifier).catch(() => null)) as
          | MermaidModule
          | null;
        if (!mod || !mod.default) {
          setUnavailable(true);
          return;
        }
        mod.default.initialize({
          startOnLoad: false,
          theme: resolvedTheme === "light" ? "default" : "dark",
          securityLevel: "strict",
        });
        const { svg } = await mod.default.render(id, content);
        if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Render failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, id, resolvedTheme, reloadKey]);

  if (unavailable) {
    return (
      <div className="p-4 text-sm">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Mermaid source (install `mermaid` for live render)
        </div>
        <pre className="text-xs overflow-auto p-3 rounded-md border bg-muted/30">{content}</pre>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        <div className="font-medium">Mermaid render error</div>
        <div className="text-xs mt-1">{error}</div>
        <pre className="mt-3 text-xs overflow-auto p-3 rounded-md border bg-muted/30">{content}</pre>
      </div>
    );
  }
  return (
    <div className="relative w-full h-full overflow-auto bg-muted/20">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card/90 backdrop-blur p-0.5 shadow-sm">
        <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setZoom(1)} className="px-1.5 text-[11px] tabular-nums text-muted-foreground hover:text-foreground" title="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Fit">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-full flex items-center justify-center p-6">
        <div
          ref={containerRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.15s ease-out" }}
        />
      </div>
    </div>
  );
}
