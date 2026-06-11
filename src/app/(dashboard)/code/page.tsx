"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Code2, X, Folder, Terminal as TermIcon, Trash2, Download, Globe, Bot } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/store";
import { WORKSPACE_TEMPLATES } from "@/lib/code/tools";
import { exportWorkspaceAsZip } from "@/lib/code/export";
import { FileTree } from "@/components/code/file-tree";
import { CodeEditor } from "@/components/code/editor";
import { AgentRail } from "@/components/code/agent-rail";
import { PushToGithub } from "@/components/code/push-to-github";
import { isEnabled } from "@/lib/feature-flags";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

const Terminal = dynamic(() => import("@/components/code/terminal").then((m) => m.Terminal), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground bg-[#0c0c0c]">Loading terminal…</div>,
});

const Preview = dynamic(() => import("@/components/code/preview").then((m) => m.Preview), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading preview…</div>,
});

export default function CodePage() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentId = useWorkspaceStore((s) => s.currentId);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const create = useWorkspaceStore((s) => s.create);
  const remove = useWorkspaceStore((s) => s.remove);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const setActive = useWorkspaceStore((s) => s.setActive);

  const [showTemplates, setShowTemplates] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Mobile (<md) shows one pane at a time via a tab switcher instead of the
  // 4-way resizable split, which is unusable on a phone.
  const [mobilePane, setMobilePane] = useState<"files" | "editor" | "terminal" | "preview" | "agent">("editor");

  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0] ?? null;

  // Auto-select first workspace if nothing is current.
  useEffect(() => {
    if (!currentId && workspaces.length > 0) setCurrent(workspaces[0].id);
  }, [currentId, workspaces, setCurrent]);

  // First-run: show template picker.
  useEffect(() => {
    if (workspaces.length === 0) setShowTemplates(true);
  }, [workspaces.length]);

  function createFromTemplate(idx: number) {
    const t = WORKSPACE_TEMPLATES[idx];
    const w = create({ name: t.name, runtime: t.runtime, files: t.files.map((f) => ({ ...f, updatedAt: Date.now() })) });
    setCurrent(w.id);
    setShowTemplates(false);
    toast.success(`Created workspace “${t.name}”`);
  }

  if (showTemplates || !current) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-primary/20 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Playground Code</h1>
            <p className="text-xs text-muted-foreground">Choose a starter to begin.</p>
          </div>
          {workspaces.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)} className="ml-auto">
              Cancel
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {WORKSPACE_TEMPLATES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => createFromTemplate(i)}
              className="text-left rounded-xl border bg-card p-5 hover:border-primary/40 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Folder className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">{t.runtime}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">{t.files.length} files</p>
            </button>
          ))}
        </div>

        {workspaces.length > 0 && (
          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your workspaces</div>
            <ul className="space-y-1.5">
              {workspaces.map((w) => (
                <li key={w.id} className="group flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-accent/40">
                  <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <button onClick={() => { setCurrent(w.id); setShowTemplates(false); }} className="flex-1 text-left">
                    <div className="text-sm font-medium">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{w.runtime} · {w.files.length} files</div>
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete workspace “${w.name}”?`)) { remove(w.id); toast.success("Deleted"); } }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="border-b bg-background flex items-center gap-2 px-3 py-1.5 overflow-x-auto">
        <Code2 className="h-4 w-4 text-primary" />
        <select
          value={current.id}
          onChange={(e) => setCurrent(e.target.value)}
          className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 font-mono">{current.runtime}</span>
        <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="ml-auto h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> New
        </Button>
        <button
          onClick={() => setTerminalOpen((v) => !v)}
          className={cn(
            "hidden lg:inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs flex-shrink-0",
            terminalOpen ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-accent text-muted-foreground",
          )}
          title="Toggle terminal"
        >
          <TermIcon className="h-3 w-3" /> Terminal
        </button>
        <button
          onClick={() => setPreviewOpen((v) => !v)}
          className={cn(
            "hidden lg:inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs flex-shrink-0",
            previewOpen ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-accent text-muted-foreground",
          )}
          title="Toggle live preview"
        >
          <Globe className="h-3 w-3" /> Preview
        </button>
        <button
          onClick={() => { exportWorkspaceAsZip(current).then(() => toast.success("Exported")); }}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md border text-xs hover:bg-accent text-muted-foreground"
          title="Download workspace as .zip"
        >
          <Download className="h-3 w-3" /> Export
        </button>
        {isEnabled("github_push") && <PushToGithub workspace={current} />}
      </div>

      {/* ── Desktop (≥lg): 4-way resizable split ───────────────────────── */}
      <div className="hidden lg:block flex-1 min-h-0">
        <PanelGroup orientation="horizontal">
          <Panel defaultSize="18%" minSize="12%" maxSize="30%">
            <div className="h-full bg-card border-r overflow-y-auto">
              <FileTree
                workspaceId={current.id}
                activePath={current.activePath}
                onOpen={(p) => { openTab(current.id, p); setActive(current.id, p); }}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />

          <Panel defaultSize="50%" minSize="25%">
            <PanelGroup orientation="vertical">
              <Panel defaultSize={terminalOpen ? "70%" : "100%"} minSize="20%">
                <div className="flex flex-col h-full">
                  {/* Tabs */}
                  <div className="border-b bg-card flex items-center overflow-x-auto">
                    {current.openTabs.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-3 py-2">No file open</div>
                    ) : (
                      current.openTabs.map((p) => {
                        const active = current.activePath === p;
                        return (
                          <div
                            key={p}
                            className={cn(
                              "group flex items-center gap-1.5 px-3 py-1.5 border-r text-xs cursor-pointer",
                              active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent/40",
                            )}
                            onClick={() => setActive(current.id, p)}
                          >
                            <span className="truncate max-w-[160px]">{p.split("/").pop()}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); closeTab(current.id, p); }}
                              className="opacity-50 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor workspaceId={current.id} path={current.activePath} />
                  </div>
                </div>
              </Panel>
              {terminalOpen && (
                <>
                  <PanelResizeHandle className="h-1 bg-border hover:bg-primary/40 transition-colors cursor-row-resize" />
                  <Panel defaultSize="30%" minSize="15%">
                    <Terminal workspaceId={current.id} onPreviewUrlChange={setPreviewUrl} />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {previewOpen && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />
              <Panel defaultSize="30%" minSize="15%" maxSize="60%">
                <Preview workspaceId={current.id} webcontainerUrl={previewUrl} />
              </Panel>
            </>
          )}
          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />

          <Panel defaultSize={previewOpen ? "28%" : "32%"} minSize="22%" maxSize="55%">
            <AgentRail workspaceId={current.id} />
          </Panel>
        </PanelGroup>
      </div>

      {/* ── Mobile / Tablet (<lg): single pane + tab switcher ─────────── */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0">
        {/* Pane tab bar */}
        <div className="flex items-stretch border-b bg-card overflow-x-auto flex-shrink-0">
          {([
            { id: "files",    label: "Files",    icon: Folder },
            { id: "editor",   label: "Editor",   icon: Code2 },
            { id: "terminal", label: "Terminal", icon: TermIcon },
            { id: "preview",  label: "Preview",  icon: Globe },
            { id: "agent",    label: "Agent",    icon: Bot },
          ] as const).map((t) => {
            const active = mobilePane === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMobilePane(t.id)}
                className={cn(
                  "flex-1 min-w-[64px] flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-medium border-b-2 transition-colors",
                  active
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Active pane */}
        <div className="flex-1 min-h-0">
          {mobilePane === "files" && (
            <div className="h-full bg-card overflow-y-auto">
              <FileTree
                workspaceId={current.id}
                activePath={current.activePath}
                onOpen={(p) => {
                  openTab(current.id, p);
                  setActive(current.id, p);
                  setMobilePane("editor"); // jump straight to the file
                }}
              />
            </div>
          )}

          {mobilePane === "editor" && (
            <div className="flex flex-col h-full">
              <div className="border-b bg-card flex items-center overflow-x-auto flex-shrink-0">
                {current.openTabs.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-3 py-2">No file open</div>
                ) : (
                  current.openTabs.map((p) => {
                    const active = current.activePath === p;
                    return (
                      <div
                        key={p}
                        className={cn(
                          "group flex items-center gap-1.5 px-3 py-2 border-r text-xs cursor-pointer flex-shrink-0",
                          active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent/40",
                        )}
                        onClick={() => setActive(current.id, p)}
                      >
                        <span className="truncate max-w-[140px]">{p.split("/").pop()}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); closeTab(current.id, p); }}
                          className="opacity-50 hover:opacity-100"
                          aria-label="Close tab"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex-1 min-h-0">
                <CodeEditor workspaceId={current.id} path={current.activePath} />
              </div>
            </div>
          )}

          {mobilePane === "terminal" && (
            <Terminal workspaceId={current.id} onPreviewUrlChange={setPreviewUrl} />
          )}

          {mobilePane === "preview" && (
            <Preview workspaceId={current.id} webcontainerUrl={previewUrl} />
          )}

          {mobilePane === "agent" && (
            <AgentRail workspaceId={current.id} />
          )}
        </div>
      </div>
    </div>
  );
}
