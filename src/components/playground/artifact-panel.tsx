"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy, Download, X, History, Check, FileCode2, FileText, Image as ImageIcon,
  GitBranch, ExternalLink, RefreshCw, Maximize2, Minimize2, Monitor, Tablet,
  Smartphone, Terminal, ChevronLeft, ChevronRight, AlertCircle, Trash2,
  BarChart3, Box, FileSpreadsheet, FileType, Map as MapIcon, Music, Network, PenSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useArtifactStore, type Artifact, type ArtifactKind } from "@/lib/store";
import { cn, copyToClipboard } from "@/lib/utils";

import { HtmlRenderer, type ConsoleEntry } from "./artifact-renderers/html-renderer";
import { SvgRenderer } from "./artifact-renderers/svg-renderer";
import { MermaidRenderer } from "./artifact-renderers/mermaid-renderer";
import { MarkdownRenderer } from "./artifact-renderers/markdown-renderer";
import { CodeRenderer } from "./artifact-renderers/code-renderer";
import { ReactRenderer } from "./artifact-renderers/react-renderer";
import { buildReactSrcdoc } from "./artifact-renderers/build-react-srcdoc";
import { ChartRenderer } from "./artifact-renderers/chart-renderer";
import { PdfRenderer } from "./artifact-renderers/pdf-renderer";
import { ThreeRenderer } from "./artifact-renderers/three-renderer";
import { AudioRenderer } from "./artifact-renderers/audio-renderer";
import { MapRenderer } from "./artifact-renderers/map-renderer";
import { SpreadsheetRenderer } from "./artifact-renderers/spreadsheet-renderer";
import { MindmapRenderer } from "./artifact-renderers/mindmap-renderer";
import { WhiteboardRenderer } from "./artifact-renderers/whiteboard-renderer";

interface Props {
  artifact: Artifact;
  onClose: () => void;
  onOpenInCode?: (artifact: Artifact) => void;
}

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 768, mobile: 390 };

const KIND_LABEL: Record<ArtifactKind, string> = {
  html: "HTML", svg: "SVG", mermaid: "Mermaid", markdown: "Markdown", react: "React", code: "Code",
  pdf: "PDF", chart: "Chart", three: "3D Scene", audio: "Audio", map: "Map",
  spreadsheet: "Spreadsheet", mindmap: "Mind Map", whiteboard: "Whiteboard",
};
const KIND_ICON: Record<ArtifactKind, React.ComponentType<{ className?: string }>> = {
  html: FileCode2, svg: ImageIcon, mermaid: GitBranch, markdown: FileText, react: FileCode2, code: FileCode2,
  pdf: FileType, chart: BarChart3, three: Box, audio: Music, map: MapIcon,
  spreadsheet: FileSpreadsheet, mindmap: Network, whiteboard: PenSquare,
};
const KIND_EXT: Record<ArtifactKind, string> = {
  html: "html", svg: "svg", mermaid: "mmd", markdown: "md", react: "tsx", code: "txt",
  pdf: "md", chart: "json", three: "js", audio: "js", map: "json",
  spreadsheet: "csv", mindmap: "md", whiteboard: "json",
};

export function ArtifactPanel({ artifact, onClose, onOpenInCode }: Props) {
  const addVersion = useArtifactStore((s) => s.addVersion);
  const [versionIndex, setVersionIndex] = useState(artifact.versions.length - 1);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [tab, setTab] = useState("preview");
  const histRef = useRef<HTMLDivElement>(null);

  const currentVersion = artifact.versions[Math.min(versionIndex, artifact.versions.length - 1)];
  const content = currentVersion?.content ?? "";
  const latestIndex = artifact.versions.length - 1;

  // Auto-advance to a freshly streamed version if the user was on the previous latest.
  useEffect(() => {
    if (versionIndex === latestIndex - 1) setVersionIndex(latestIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestIndex]);

  const Icon = KIND_ICON[artifact.kind];
  const ext = artifact.language || KIND_EXT[artifact.kind];
  const hasPreview = artifact.kind !== "code";
  // "Live preview" surfaces include the new sandboxed iframe renderers — they
  // emit console output through the bridge and should expose Reload + Console.
  const isLivePreview =
    artifact.kind === "html" ||
    artifact.kind === "react" ||
    artifact.kind === "chart" ||
    artifact.kind === "three" ||
    artifact.kind === "audio" ||
    artifact.kind === "map" ||
    artifact.kind === "mindmap" ||
    artifact.kind === "whiteboard" ||
    artifact.kind === "pdf";
  const errorCount = useMemo(() => logs.filter((l) => l.level === "error").length, [logs]);

  // Collect console + runtime errors forwarded by the HTML/React sandbox bridge.
  useEffect(() => {
    if (!isLivePreview) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.__llmatlas_console) {
        setLogs((prev) => [...prev.slice(-199), { level: d.level, text: d.text, ts: Date.now() }]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isLivePreview]);

  // Reset logs when content/version/reload changes.
  useEffect(() => { setLogs([]); }, [content, reloadKey]);

  const onCopy = useCallback(async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copied artifact");
  }, [content]);

  const onDownload = () => {
    const blob = new Blob([content], { type: mimeForKind(artifact.kind) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(artifact.title)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const onOpenNewTab = () => {
    const doc = standaloneDoc(artifact.kind, content);
    const blob = new Blob([doc], { type: artifact.kind === "svg" ? "image/svg+xml" : "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const renderer = useMemo(() => {
    switch (artifact.kind) {
      case "html": return <HtmlRenderer content={content} wrap reloadKey={reloadKey} />;
      case "svg": return <SvgRenderer content={content} reloadKey={reloadKey} />;
      case "mermaid": return <MermaidRenderer content={content} reloadKey={reloadKey} />;
      case "markdown": return <MarkdownRenderer content={content} />;
      case "react": return <ReactRenderer content={content} language={artifact.language} reloadKey={reloadKey} />;
      case "code": return <CodeRenderer content={content} language={artifact.language} />;
      case "pdf": return <PdfRenderer content={content} reloadKey={reloadKey} />;
      case "chart": return <ChartRenderer content={content} reloadKey={reloadKey} />;
      case "three": return <ThreeRenderer content={content} reloadKey={reloadKey} />;
      case "audio": return <AudioRenderer content={content} reloadKey={reloadKey} />;
      case "map": return <MapRenderer content={content} reloadKey={reloadKey} />;
      case "spreadsheet": return <SpreadsheetRenderer content={content} reloadKey={reloadKey} />;
      case "mindmap": return <MindmapRenderer content={content} reloadKey={reloadKey} />;
      case "whiteboard": return <WhiteboardRenderer content={content} reloadKey={reloadKey} />;
    }
  }, [artifact.kind, artifact.language, content, reloadKey]);

  const deviceWidth = DEVICE_WIDTH[device];
  const framedPreview = (
    <div className="relative flex-1 min-h-0 bg-muted/30 overflow-hidden">
      {deviceWidth ? (
        <div className="h-full w-full overflow-auto flex justify-center py-4">
          <div
            className="bg-white shadow-xl rounded-lg overflow-hidden ring-1 ring-black/10 h-full"
            style={{ width: deviceWidth, maxWidth: "100%", flexShrink: 0 }}
          >
            {renderer}
          </div>
        </div>
      ) : (
        <div className="h-full w-full">{renderer}</div>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full bg-card", fullscreen ? "fixed inset-0 z-50" : "border-l")}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{artifact.title}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{KIND_LABEL[artifact.kind]}</Badge>
            {artifact.versions.length > 1 && (
              <>
                <span>·</span>
                <button onClick={() => setVersionIndex((i) => Math.max(0, i - 1))} disabled={versionIndex <= 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-30" title="Previous version">
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1 hover:text-foreground" title="Version history">
                  <History className="h-3 w-3" /> v{versionIndex + 1}/{artifact.versions.length}
                </button>
                <button onClick={() => setVersionIndex((i) => Math.min(latestIndex, i + 1))} disabled={versionIndex >= latestIndex} className="p-0.5 rounded hover:bg-accent disabled:opacity-30" title="Next version">
                  <ChevronRight className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isLivePreview && tab === "preview" && (
            <button onClick={() => setReloadKey((k) => k + 1)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Reload preview">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {(artifact.kind === "html" || artifact.kind === "svg" || artifact.kind === "react") && (
            <button onClick={onOpenNewTab} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Open in new tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onCopy} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDownload} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Download">
            <Download className="h-3.5 w-3.5" />
          </button>
          {onOpenInCode && (
            <button onClick={() => onOpenInCode(artifact)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground hidden sm:inline-flex" title="Open in Playground Code">
              <FileCode2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setFullscreen((v) => !v)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Version history dropdown */}
      {showHistory && artifact.versions.length > 1 && (
        <div ref={histRef} className="border-b bg-muted/20 max-h-40 overflow-auto">
          {artifact.versions.map((v, i) => (
            <button
              key={v.id}
              onClick={() => { setVersionIndex(i); setShowHistory(false); }}
              className={cn("w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-accent", i === versionIndex && "bg-accent/60 font-medium")}
            >
              <span>Version {i + 1}{i === latestIndex && " (latest)"}</span>
              <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleTimeString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {hasPreview ? (
          <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
            <div className="px-3 pt-2 border-b flex items-center justify-between gap-2">
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs h-6">Preview</TabsTrigger>
                <TabsTrigger value="code" className="text-xs h-6">Code</TabsTrigger>
              </TabsList>

              {/* Device toggle — only meaningful for live web previews */}
              {tab === "preview" && isLivePreview && (
                <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                  {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, DIcon]) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={cn("p-1.5 rounded transition-colors", device === d ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                      title={`${d[0].toUpperCase()}${d.slice(1)} preview`}
                    >
                      <DIcon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col">
              {framedPreview}
              {/* Console drawer */}
              {isLivePreview && (
                <ConsoleDrawer logs={logs} open={showConsole} onToggle={() => setShowConsole((v) => !v)} onClear={() => setLogs([])} errorCount={errorCount} />
              )}
            </TabsContent>

            <TabsContent value="code" className="flex-1 min-h-0 mt-0 data-[state=active]:flex">
              <div className="flex-1 min-h-0">
                <CodeRenderer content={content} language={artifact.language ?? KIND_EXT[artifact.kind]} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="h-full">{renderer}</div>
        )}
      </div>

      {/* Footer: edit + save-as-version */}
      <EditFooter
        content={content}
        onSaveVersion={(next) => {
          addVersion(artifact.id, next, artifact.language);
          setVersionIndex(artifact.versions.length);
          toast.success("Saved new version");
        }}
      />
    </div>
  );
}

function ConsoleDrawer({ logs, open, onToggle, onClear, errorCount }: {
  logs: ConsoleEntry[]; open: boolean; onToggle: () => void; onClear: () => void; errorCount: number;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: "end" }); }, [logs, open]);

  return (
    <div className="border-t flex-shrink-0">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent/50 transition-colors">
        <Terminal className="h-3.5 w-3.5" />
        <span className="font-medium">Console</span>
        {logs.length > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{logs.length}</Badge>}
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1 text-red-500">
            <AlertCircle className="h-3 w-3" />{errorCount}
          </span>
        )}
        <span className="ml-auto opacity-60">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="max-h-40 overflow-auto border-t bg-[#1e2127] text-[11px] font-mono">
          {logs.length === 0 ? (
            <div className="px-3 py-3 text-white/40">No console output.</div>
          ) : (
            <>
              <div className="flex justify-end px-2 py-1 sticky top-0 bg-[#1e2127]">
                <button onClick={onClear} className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/10" title="Clear console">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-1 border-b border-white/5 whitespace-pre-wrap break-words",
                    l.level === "error" && "text-red-400 bg-red-500/5",
                    l.level === "warn" && "text-amber-400 bg-amber-500/5",
                    (l.level === "log" || l.level === "info") && "text-white/70",
                  )}
                >
                  {l.text}
                </div>
              ))}
              <div ref={endRef} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditFooter({ content, onSaveVersion }: { content: string; onSaveVersion: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState(content);

  if (!editing) {
    return (
      <div className="border-t px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div className="text-[10px] text-muted-foreground">Editing creates a new version.</div>
        <button onClick={() => { setBuffer(content); setEditing(true); }} className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          Edit
        </button>
      </div>
    );
  }
  return (
    <div className="border-t bg-muted/20 flex-shrink-0">
      <textarea
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        className="w-full h-32 p-3 bg-transparent text-xs font-mono focus:outline-none resize-none"
      />
      <div className="flex justify-end gap-1 px-2 pb-2">
        <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded hover:bg-accent">Cancel</button>
        <button onClick={() => { onSaveVersion(buffer); setEditing(false); }} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
          Save version
        </button>
      </div>
    </div>
  );
}

function standaloneDoc(kind: ArtifactKind, content: string): string {
  if (kind === "react") {
    return buildReactSrcdoc(content);
  }
  if (kind === "html") {
    if (/<!DOCTYPE|<html[\s>]/i.test(content)) {
      return /tailwindcss/i.test(content) ? content : content.replace(/<head[^>]*>/i, (m) => m + '<script src="https://cdn.tailwindcss.com"></script>');
    }
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://cdn.tailwindcss.com"></script></head><body>${content}</body></html>`;
  }
  if (kind === "svg") {
    return `<!doctype html><html><head><meta charset="utf-8"/><style>body{margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa}</style></head><body>${content}</body></html>`;
  }
  return content;
}

function mimeForKind(kind: ArtifactKind): string {
  switch (kind) {
    case "html": return "text/html";
    case "svg": return "image/svg+xml";
    case "markdown": return "text/markdown";
    case "mermaid": return "text/plain";
    case "pdf": return "text/markdown";
    case "chart":
    case "map":
    case "whiteboard": return "application/json";
    case "three":
    case "audio": return "text/javascript";
    case "spreadsheet": return "text/csv";
    case "mindmap": return "text/markdown";
    case "react":
    case "code":
    default: return "text/plain";
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "artifact";
}
