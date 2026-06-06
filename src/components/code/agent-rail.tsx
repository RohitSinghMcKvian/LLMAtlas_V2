"use client";

import { useRef, useState } from "react";
import { Send, Square, Sparkles, ChevronDown, ChevronRight, CheckCircle2, XCircle, Terminal as TermIcon, FileCode2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { findModel } from "@/lib/models";
import { useSettingsStore, useWorkspaceStore } from "@/lib/store";
import {
  AGENT_TOOLS, executeTool, workspaceSummary,
  isMutatingTool, previewMutation,
  type ToolCall, type ToolResult, type PendingMutation,
} from "@/lib/code/tools";
import { DiffViewer } from "./diff-viewer";
import { cn } from "@/lib/utils";

interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  pendingMutation?: PendingMutation;
  pendingResolved?: "approved" | "rejected";
  collapsed?: boolean;
}

/** Slash command shortcuts injected as prefixes into the user message. */
const AGENT_SLASH: Record<string, string> = {
  "/init": "Generate a comprehensive CLAUDE.md describing this codebase: project structure, key dependencies, how to run, common tasks. Read package.json and a few source files first, then write CLAUDE.md.",
  "/plan": "Enter plan mode. Read the relevant files, then propose an implementation plan in numbered steps. Do NOT call any write_file/edit_file tools — just describe the plan.",
  "/test": "Read package.json, find the test script, then run it and report results. If no tests exist, propose a minimal test harness.",
  "/explain": "Explain the project's architecture in 200 words: tech stack, key files, control flow.",
};

interface Props {
  workspaceId: string;
}

const AGENT_SYSTEM = `You are an expert software engineer working inside a browser-based IDE. You can read, edit, and create files in the user's workspace, run shell commands (stubbed), grep, glob, and list directory contents. Use the tools provided. When you finish a task, briefly summarize what you changed. Prefer small, focused edits. Always re-read a file before editing it.`;

export function AgentRail({ workspaceId }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const byok = useSettingsStore((s) => s.keys);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const approvalResolversRef = useRef<Map<string, (r: "approved" | "rejected") => void>>(new Map());
  const model = findModel(defaultModel);

  function waitForApproval(callId: string): Promise<"approved" | "rejected"> {
    return new Promise((resolve) => {
      approvalResolversRef.current.set(callId, resolve);
    });
  }

  function approveMutation(callId: string) {
    setMessages((p) => p.map((m) => (m.toolCall?.id === callId ? { ...m, pendingResolved: "approved" } : m)));
    approvalResolversRef.current.get(callId)?.("approved");
    approvalResolversRef.current.delete(callId);
  }
  function rejectMutation(callId: string) {
    setMessages((p) => p.map((m) => (m.toolCall?.id === callId ? { ...m, pendingResolved: "rejected" } : m)));
    approvalResolversRef.current.get(callId)?.("rejected");
    approvalResolversRef.current.delete(callId);
  }
  function enableAutoApprove(callId: string) {
    setAutoApprove(true);
    approveMutation(callId);
    toast.success("Auto-approve enabled for this session");
  }

  async function send() {
    if (!ws || !model || !input.trim() || busy) return;
    let prompt = input.trim();
    // Slash-command expansion
    for (const [cmd, expansion] of Object.entries(AGENT_SLASH)) {
      if (prompt === cmd || prompt.startsWith(cmd + " ")) {
        const extra = prompt.slice(cmd.length).trim();
        prompt = expansion + (extra ? `\n\nAdditional context: ${extra}` : "");
        break;
      }
    }
    // Attached files context
    if (attachedFiles.length) {
      const contexts = attachedFiles
        .map((p) => ws.files.find((f) => f.path === p))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 5000)}\n--- end ---`)
        .join("\n\n");
      prompt = prompt + "\n\nAttached files:\n" + contexts;
      setAttachedFiles([]);
    }
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setBusy(true);
    abortRef.current = new AbortController();

    try {
      // Single round-trip agent loop: send chat, parse any tool calls from text, execute, recurse.
      const conversation: AgentMessage[] = [...messages, userMsg];
      const MAX_TURNS = 6;
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const placeholder: AgentMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
        setMessages((p) => [...p, placeholder]);

        const sysPrompt = `${AGENT_SYSTEM}\n\nYou have access to these tools:\n${AGENT_TOOLS.map((t) => `- ${t.name}(${Object.keys((t.parameters as { properties?: Record<string, unknown> }).properties ?? {}).join(", ")}) — ${t.description}`).join("\n")}\n\nTo call a tool, output a JSON block in this exact form, on its own:\n\n\`\`\`tool\n{"name": "read_file", "args": {"path": "src/index.ts"}}\n\`\`\`\n\nAfter you call a tool, wait for the result before continuing. When you're done, reply normally without a tool block.\n\nCurrent workspace state:\n${workspaceSummary(ws)}`;

        const apiMessages = [
          { role: "system" as const, content: sysPrompt },
          ...conversation.map((m) => ({
            role: m.role === "tool" ? ("user" as const) : (m.role as "user" | "assistant"),
            content: m.role === "tool" ? `Tool result for ${m.toolCall?.name}: ${JSON.stringify(m.toolResult)}` : m.content,
          })),
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            modelId: model.id,
            messages: apiMessages,
            temperature: 0.2,
            maxTokens: 2048,
            apiKey: byok[model.provider],
          }),
        });
        if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "request failed"));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          setMessages((p) => {
            const copy = [...p];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: buf };
            return copy;
          });
        }

        const finalAssistant: AgentMessage = { ...placeholder, content: buf };
        conversation.push(finalAssistant);

        // Look for ```tool block
        const toolMatch = /```tool\s*\n([\s\S]*?)```/.exec(buf);
        if (!toolMatch) break;
        let call: ToolCall;
        try {
          const parsed = JSON.parse(toolMatch[1]) as { name: string; args?: Record<string, unknown> };
          call = { id: crypto.randomUUID(), name: parsed.name, args: parsed.args ?? {} };
        } catch {
          toast.error("Couldn't parse tool call JSON");
          break;
        }
        const requiresApproval = isMutatingTool(call.name) && !autoApprove;
        if (requiresApproval) {
          const mutation = previewMutation(workspaceId, call);
          const toolMsg: AgentMessage = {
            id: crypto.randomUUID(),
            role: "tool",
            content: "",
            toolCall: call,
            pendingMutation: mutation ?? undefined,
          };
          setMessages((p) => [...p, toolMsg]);
          // Wait for user approval before continuing the loop.
          const resolved = await waitForApproval(call.id);
          if (resolved === "rejected") {
            setMessages((p) => p.map((m) => (m.toolCall?.id === call.id
              ? { ...m, toolResult: { ok: false, error: "User rejected this mutation." } }
              : m)));
            conversation.push({ ...toolMsg, toolResult: { ok: false, error: "User rejected this mutation." } });
            break;
          }
          const result = await executeTool(workspaceId, call);
          setMessages((p) => p.map((m) => (m.toolCall?.id === call.id ? { ...m, toolResult: result } : m)));
          conversation.push({ ...toolMsg, toolResult: result });
        } else {
          const result = await executeTool(workspaceId, call);
          const toolMsg: AgentMessage = {
            id: crypto.randomUUID(),
            role: "tool",
            content: "",
            toolCall: call,
            toolResult: result,
          };
          setMessages((p) => [...p, toolMsg]);
          conversation.push(toolMsg);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Agent failed");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <div className="text-xs font-semibold">Agent</div>
        {autoApprove && (
          <button
            onClick={() => { setAutoApprove(false); toast.info("Approval prompts re-enabled"); }}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400"
            title="Click to disable auto-approve"
          >
            <ShieldCheck className="h-2.5 w-2.5" /> auto
          </button>
        )}
        <div className="text-[10px] text-muted-foreground ml-auto truncate">{model?.name ?? "no model"}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-50" />
            Ask the agent to read, write, search, or modify files in this workspace.
            <div className="mt-3 text-[10px] text-muted-foreground/70 font-mono">
              Try: /init · /plan · /test · /explain
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <AgentMessageView
              key={m.id}
              m={m}
              onApprove={() => m.toolCall && approveMutation(m.toolCall.id)}
              onReject={() => m.toolCall && rejectMutation(m.toolCall.id)}
              onAutoApprove={() => m.toolCall && enableAutoApprove(m.toolCall.id)}
            />
          ))
        )}
      </div>

      <div
        className="border-t p-2"
        onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-llmatlas-file")) { e.preventDefault(); } }}
        onDrop={(e) => {
          const path = e.dataTransfer.getData("application/x-llmatlas-file");
          if (path && !attachedFiles.includes(path)) {
            setAttachedFiles((p) => [...p, path]);
            toast.success(`Attached ${path}`);
          }
          e.preventDefault();
        }}
      >
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {attachedFiles.map((p) => (
              <div key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-card text-[10px]">
                <FileCode2 className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="truncate max-w-[160px] font-mono">{p}</span>
                <button onClick={() => setAttachedFiles((a) => a.filter((x) => x !== p))} className="opacity-60 hover:opacity-100">
                  <XCircle className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Card className="p-1.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask the agent… or /init /plan /test /explain · drop files here for context"
            className="border-0 resize-none focus-visible:ring-0 min-h-[44px] text-xs"
          />
          <div className="flex justify-end mt-1">
            {busy ? (
              <Button size="sm" variant="destructive" onClick={stop} className="h-6 gap-1 text-xs">
                <Square className="h-3 w-3" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={send} disabled={!input.trim() || !model} className="h-6 gap-1 text-xs">
                <Send className="h-3 w-3" /> Send
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AgentMessageView({
  m,
  onApprove,
  onReject,
  onAutoApprove,
}: {
  m: AgentMessage;
  onApprove: () => void;
  onReject: () => void;
  onAutoApprove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (m.role === "tool") {
    // Pending mutation — show diff + approval gate
    if (m.pendingMutation && !m.pendingResolved) {
      return <DiffViewer mutation={m.pendingMutation} onApprove={onApprove} onReject={onReject} onAutoApprove={onAutoApprove} />;
    }
    const ok = m.toolResult?.ok;
    const Icon = m.toolCall?.name === "run_bash" ? TermIcon : FileCode2;
    return (
      <div className="rounded-md border bg-muted/30 text-xs">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono font-medium">{m.toolCall?.name}</span>
          <span className="text-muted-foreground truncate flex-1 text-left">
            {Object.entries(m.toolCall?.args ?? {}).map(([k, v]) => `${k}=${typeof v === "string" ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 30)}`).join(", ")}
          </span>
          {ok ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
        </button>
        {!collapsed && (
          <div className="px-2 pb-2">
            <pre className="text-[10px] font-mono bg-background/60 p-2 rounded border overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {m.toolResult?.ok
                ? typeof m.toolResult.output === "string"
                  ? m.toolResult.output
                  : JSON.stringify(m.toolResult.output, null, 2)
                : `Error: ${m.toolResult?.error}`}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const isUser = m.role === "user";
  return (
    <div className={cn("text-xs", isUser ? "ml-4" : "mr-4")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{isUser ? "You" : "Agent"}</div>
      <div className={cn("rounded-md p-2 whitespace-pre-wrap break-words", isUser ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border")}>
        {m.content || <span className="text-muted-foreground italic">…</span>}
      </div>
    </div>
  );
}
