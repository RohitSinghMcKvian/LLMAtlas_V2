"use client";

import { Download, FileText, FileCode2, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
  latencyMs?: number;
  tokens?: number;
  modelId?: string;
}

interface Props {
  messages: Msg[];
  modelName?: string;
  systemPrompt?: string;
  conversationTitle?: string;
  disabled?: boolean;
}

export function ExportMenu({ messages, modelName, systemPrompt, conversationTitle, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const exportMarkdown = () => {
    const lines = [
      `# ${conversationTitle ?? "Conversation"}`,
      `> Model: **${modelName ?? "Unknown"}**`,
      systemPrompt ? `> System: ${systemPrompt}` : "",
      "",
    ];
    for (const m of messages) {
      if (m.role === "system") continue;
      lines.push(`## ${m.role === "user" ? "You" : modelName ?? "Assistant"}`);
      lines.push(m.content);
      if (m.latencyMs || m.tokens) {
        const parts = [];
        if (m.latencyMs) parts.push(`${(m.latencyMs / 1000).toFixed(2)}s`);
        if (m.tokens) parts.push(`~${m.tokens} tok`);
        lines.push(`\n*${parts.join(" · ")}*`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${conversationTitle ?? "conversation"}-${Date.now()}.md`;
    a.click();
    toast.success("Exported as Markdown");
    setOpen(false);
  };

  const exportJSON = () => {
    const data = {
      title: conversationTitle,
      model: modelName,
      systemPrompt,
      exportedAt: new Date().toISOString(),
      messages: messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role,
        content: m.content,
        latencyMs: m.latencyMs,
        tokens: m.tokens,
        modelId: m.modelId,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${conversationTitle ?? "conversation"}-${Date.now()}.json`;
    a.click();
    toast.success("Exported as JSON");
    setOpen(false);
  };

  const exportHTML = () => {
    const htmlMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => `
        <div class="message ${m.role}">
          <div class="role">${m.role === "user" ? "You" : modelName ?? "Assistant"}</div>
          <div class="content">${m.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")}</div>
          ${m.latencyMs ? `<div class="meta">${(m.latencyMs / 1000).toFixed(2)}s · ~${m.tokens ?? 0} tokens</div>` : ""}
        </div>
      `).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${conversationTitle ?? "Conversation"}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; line-height: 1.6; color: #1e293b; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .meta-header { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
  .message { margin: 1.5rem 0; padding: 1rem 1.25rem; border-radius: 0.75rem; }
  .message.user { background: #f1f5f9; }
  .message.assistant { background: #eff6ff; border-left: 3px solid #3b82f6; }
  .role { font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
  .content { font-size: 0.95rem; white-space: pre-wrap; }
  .meta { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; }
</style>
</head>
<body>
<h1>${conversationTitle ?? "Conversation"}</h1>
<div class="meta-header">Model: <strong>${modelName ?? "Unknown"}</strong> · Exported ${new Date().toLocaleString()}</div>
${htmlMessages}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${conversationTitle ?? "conversation"}-${Date.now()}.html`;
    a.click();
    toast.success("Exported as HTML");
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || messages.length === 0}
        title="Export conversation"
        className={cn(
          "inline-flex items-center gap-1 h-9 px-2.5 rounded-md border text-xs font-medium transition-colors",
          "bg-muted/30 hover:bg-accent text-muted-foreground hover:text-foreground",
          (disabled || messages.length === 0) && "opacity-40 cursor-not-allowed",
        )}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-xl shadow-xl overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-100">
          <button
            onClick={exportMarkdown}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
          >
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span>Markdown (.md)</span>
          </button>
          <button
            onClick={exportJSON}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
          >
            <FileCode2 className="h-3.5 w-3.5 text-amber-500" />
            <span>JSON (.json)</span>
          </button>
          <button
            onClick={exportHTML}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
          >
            <FileCode2 className="h-3.5 w-3.5 text-violet-500" />
            <span>HTML (.html)</span>
          </button>
        </div>
      )}
    </div>
  );
}
