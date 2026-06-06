"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Globe } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

interface Props {
  workspaceId: string;
  /** Set by Terminal when a WebContainer server-ready event fires. */
  webcontainerUrl?: string | null;
}

/**
 * Live preview pane.
 *   - Static workspaces: build a srcdoc from the workspace files (index.html + inlined CSS/JS).
 *   - Node workspaces: embed the WebContainer dev-server URL when ready.
 *   - Python workspaces: not applicable; render a friendly note.
 */
export function Preview({ workspaceId, webcontainerUrl }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcdoc = useMemo(() => {
    if (!ws || ws.runtime !== "static") return null;
    const indexHtml = ws.files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
    if (!indexHtml) return null;
    let html = indexHtml.content;
    // Inline local CSS
    html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (full, href: string) => {
      const css = ws.files.find((f) => f.path === href || f.path.endsWith("/" + href));
      return css ? `<style>${css.content}</style>` : full;
    });
    // Inline local JS
    html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g, (full, src: string) => {
      const js = ws.files.find((f) => f.path === src || f.path.endsWith("/" + src));
      return js ? `<script>${js.content}</script>` : full;
    });
    return html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, reloadKey]);

  useEffect(() => {
    setReloadKey((k) => k + 1);
  }, [webcontainerUrl]);

  if (!ws) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b">
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Preview</span>
        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {ws.runtime === "node" ? webcontainerUrl ?? "(start dev server in terminal)" : ws.runtime}
        </span>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
          title="Reload"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
        {webcontainerUrl && (
          <a
            href={webcontainerUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            title="Open in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {ws.runtime === "static" && srcdoc ? (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            srcDoc={srcdoc}
            title="Static preview"
            sandbox="allow-scripts allow-forms allow-popups"
            className="w-full h-full border-0"
          />
        ) : ws.runtime === "node" && webcontainerUrl ? (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={webcontainerUrl}
            title="Dev server preview"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-6 text-center">
            {ws.runtime === "node"
              ? "Run a dev server (npm run dev) in the terminal to see the live preview."
              : ws.runtime === "python"
              ? "Python workspaces don't have a live preview — use the terminal for output."
              : "Create index.html to preview your static site."}
          </div>
        )}
      </div>
    </div>
  );
}
