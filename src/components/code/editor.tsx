"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useWorkspaceStore } from "@/lib/store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading editor…</div>,
});

interface Props {
  workspaceId: string;
  path: string | null;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript", mjs: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    c: "c", cpp: "cpp", h: "c", cs: "csharp",
    html: "html", css: "css", scss: "scss",
    json: "json", yaml: "yaml", yml: "yaml", toml: "ini",
    md: "markdown", sql: "sql", sh: "shell",
  };
  return map[ext] ?? "plaintext";
}

export function CodeEditor({ workspaceId, path }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const writeFile = useWorkspaceStore((s) => s.writeFile);
  const file = path ? ws?.files.find((f) => f.path === path) ?? null : null;

  const language = useMemo(() => (path ? detectLanguage(path) : "plaintext"), [path]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground bg-muted/10">
        Select a file from the tree to start editing.
      </div>
    );
  }

  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={file.content}
      onChange={(v) => writeFile(workspaceId, file.path, v ?? "")}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
