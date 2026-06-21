"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Send, Square, Sparkles, ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Terminal as TermIcon, FileCode2, Trash2, Eye, EyeOff, Undo2, Redo2,
  Command as CommandIcon, Brain, Swords, BrainCircuit,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { findModel, supportsTools } from "@/lib/models";
import { useSettingsStore, useWorkspaceStore } from "@/lib/store";
import { parseStreamBuffer } from "@/lib/stream-events";
import { resetContainerMount } from "@/lib/code/webcontainer";
import {
  previewMutation,
  type ToolCall, type ToolResult,
} from "@/lib/code/tools";
import {
  executeTool, isMutatingTool, isDynamicTool, allToolDefinitions,
} from "@/lib/brain/registry";
import { buildSystemPrompt, agentToolsAsNative } from "@/lib/brain/prompt";
import { syncAllMcpServers } from "@/lib/brain/mcp";
import { registerMemoryTools } from "@/lib/brain/memory-tools";
import { syncWebTools } from "@/lib/brain/web-tools";
import { recall, formatMemoriesForPrompt, useMemoryStore } from "@/lib/brain/memory";
import { parseToolCall, findToolBlock, stringifyResult, commandFailed, stripToolBlocks } from "@/lib/brain/parse";
import { ComparisonArena } from "./comparison-arena";
import { MemoryOverlay } from "@/components/settings/memory-panel";
import {
  useAgentStore, EMPTY_MESSAGES, EMPTY_PLAN, EMPTY_CHECKPOINTS,
  type AgentMessage, type AutonomyMode,
} from "@/lib/code/agent-store";
import { AgentPlan } from "./agent-plan";
import { AgentControls, type RunStats } from "./agent-controls";
import { DiffViewer } from "./diff-viewer";
import { AgentModelSelector } from "./agent-model-selector";
import { CommandPalette, useCommandPaletteShortcut, buildAgentCommands } from "./command-palette";
import { SessionManager, saveCurrentSession, downloadMarkdown } from "./session-manager";
import { HelpDialog } from "./help-dialog";
import { FileMentionPopup } from "./file-mention";
import { cn } from "@/lib/utils";

const AGENT_SLASH: Record<string, string> = {
  "/init": "Generate a comprehensive CLAUDE.md describing this codebase: project structure, key dependencies, how to run, common tasks. Read package.json and a few source files first, then write CLAUDE.md.",
  "/plan": "Analyze the request and the workspace, then call update_plan with a numbered checklist. Do NOT write or edit files yet — just produce the plan and wait for me.",
  "/test": "Run the test suite with run_tests. If it fails, read the error, fix the cause, and re-run until it passes. If no tests exist, create a minimal one and run it.",
  "/document": "Generate documentation: call generate_docs, refine the README for this project and write it with write_file, then add concise top-of-file comments where helpful.",
  "/explain": "Explain the project's architecture in ~200 words: tech stack, key files, control flow. Read a few files first. Do not modify anything.",
  "/compact": "Summarize the conversation so far in 3-5 concise bullet points, focusing on what was accomplished, what changed, and the current state. Then I will start a new session with this context.",
};

const MAX_TURNS = 30;
const MAX_FIX_ATTEMPTS = 6;
const AGENT_MAX_TOKENS = 4096;

interface Props {
  workspaceId: string;
}

function needsApproval(toolName: string, mode: AutonomyMode): boolean {
  if (mode === "autonomous") return false;
  if (!isMutatingTool(toolName)) return false;
  if (mode === "manual") return true;
  // Smart mode: gate built-in file writes AND every external/dynamic tool
  // (MCP, web). External-tool mutations are never silently auto-approved.
  return (
    isDynamicTool(toolName) ||
    toolName === "write_file" ||
    toolName === "edit_file" ||
    toolName === "delete_file"
  );
}

/** Extract <thinking>...</thinking> blocks from assistant messages. */
function splitThinking(content: string): { thinking: string | null; visible: string } {
  const re = /<thinking>([\s\S]*?)<\/thinking>/g;
  const thinkParts: string[] = [];
  const visible = content.replace(re, (_, inner) => { thinkParts.push(inner.trim()); return ""; }).trim();
  return { thinking: thinkParts.length > 0 ? thinkParts.join("\n\n") : null, visible };
}

export function AgentRail({ workspaceId }: Props) {
  const ws = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const replaceFiles = useWorkspaceStore((s) => s.replaceFiles);
  const byok = useSettingsStore((s) => s.keys);
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const mcpServers = useSettingsStore((s) => s.mcpServers);
  const webTools = useSettingsStore((s) => s.webTools);
  const memoryCount = useMemoryStore((s) => s.memories.length);

  const mode = useAgentStore((s) => s.mode);
  const setMode = useAgentStore((s) => s.setMode);
  const setMessages = useAgentStore((s) => s.setMessages);
  const pushCheckpoint = useAgentStore((s) => s.pushCheckpoint);
  const clearConversation = useAgentStore((s) => s.clearConversation);
  const wsState = useAgentStore((s) => s.byWorkspace[workspaceId]);
  const messages = wsState?.messages ?? EMPTY_MESSAGES;
  const plan = wsState?.plan ?? EMPTY_PLAN;
  const checkpoints = wsState?.checkpoints ?? EMPTY_CHECKPOINTS;

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);

  // OpenCode features state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(true);
  const [undoStack, setUndoStack] = useState<AgentMessage[][]>([]);
  const [redoStack, setRedoStack] = useState<AgentMessage[][]>([]);

  // @ file mention state
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const mentionAnchorRef = useRef(0);

  const abortRef = useRef<AbortController | null>(null);
  const abortedRef = useRef(false);
  const convoRef = useRef<AgentMessage[]>([]);
  const statsRef = useRef<RunStats>({ turns: 0, tokensIn: 0, tokensOut: 0, costUSD: 0, elapsedMs: 0 });
  const approvalResolversRef = useRef<Map<string, (r: "approved" | "rejected") => void>>(new Map());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const model = findModel(defaultModel);

  const filePaths = useMemo(() => ws?.files.map((f) => f.path) ?? [], [ws?.files]);

  // Command palette shortcut (Ctrl+K)
  useCommandPaletteShortcut(useCallback(() => setPaletteOpen(true), []));

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "n") { e.preventDefault(); newConversation(); }
      if (ctrl && e.key === "l" && !e.shiftKey) { e.preventDefault(); setSessionsOpen(true); }
      if (ctrl && e.key === "e" && !e.shiftKey) { e.preventDefault(); handleExport(); }
      if (ctrl && e.key === "m") { e.preventDefault(); handleModelOpen(); }
      if (ctrl && e.key === "t" && !e.shiftKey) { e.preventDefault(); setShowThinking((v) => !v); }
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (ctrl && e.key === "y") { e.preventDefault(); handleRedo(); }
      if (e.key === "?" && !ctrl && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setHelpOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, undoStack]);

  useEffect(() => {
    setMessages(workspaceId, (prev) =>
      prev.map((m) =>
        m.pendingMutation && !m.pendingResolved && !m.toolResult
          ? { ...m, pendingResolved: "rejected" as const, toolResult: { ok: false, error: "Session ended before approval." } }
          : m,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Connect to configured MCP servers and register their tools into the brain
  // registry. Re-runs whenever the server list changes (add/remove/toggle).
  useEffect(() => {
    if (!mcpServers.some((s) => s.enabled)) return;
    let cancelled = false;
    syncAllMcpServers(mcpServers).then((results) => {
      if (cancelled) return;
      const failed = results.filter((r) => !r.ok);
      const tools = results.reduce((n, r) => n + r.toolCount, 0);
      if (failed.length) {
        toast.error(`MCP: ${failed.length} server${failed.length === 1 ? "" : "s"} failed to connect`);
      } else if (tools > 0) {
        toast.success(`MCP: ${tools} tool${tools === 1 ? "" : "s"} connected`);
      }
    });
    return () => { cancelled = true; };
  }, [mcpServers]);

  // Register the persistent-memory tools (recall/remember/search_workspace) into
  // the brain registry once, so the agent can learn and recall across sessions.
  useEffect(() => { registerMemoryTools(); }, []);

  // Register/clear the web tools (web_search/fetch_url/browse) to match settings.
  useEffect(() => { syncWebTools(webTools); }, [webTools]);

  function commit(next: AgentMessage[]) {
    convoRef.current = next;
    setMessages(workspaceId, () => next);
  }

  function waitForApproval(callId: string): Promise<"approved" | "rejected"> {
    return new Promise((resolve) => approvalResolversRef.current.set(callId, resolve));
  }
  function approveMutation(callId: string) {
    commit(convoRef.current.map((m) => (m.toolCall?.id === callId ? { ...m, pendingResolved: "approved" } : m)));
    approvalResolversRef.current.get(callId)?.("approved");
    approvalResolversRef.current.delete(callId);
  }
  function rejectMutation(callId: string) {
    commit(convoRef.current.map((m) => (m.toolCall?.id === callId ? { ...m, pendingResolved: "rejected" } : m)));
    approvalResolversRef.current.get(callId)?.("rejected");
    approvalResolversRef.current.delete(callId);
  }
  function enableAutoApprove(callId: string) {
    setMode("autonomous");
    approveMutation(callId);
    toast.success("Autonomous mode on — the agent won't ask again this session");
  }

  function accumulateStats(apiMessages: unknown, finalText: string, events: ReturnType<typeof parseStreamBuffer>["events"], startedAt: number) {
    const usage = events.find((e) => e.kind === "usage");
    const tin = usage?.promptTokens ?? Math.ceil(JSON.stringify(apiMessages).length / 4);
    const tout = usage?.completionTokens ?? Math.ceil(finalText.length / 4);
    const turnCost = usage?.costUSD ?? (model ? (tin / 1e6) * model.inputPrice + (tout / 1e6) * model.outputPrice : 0);
    const s = statsRef.current;
    s.turns += 1;
    s.tokensIn += tin;
    s.tokensOut += tout;
    s.costUSD += turnCost;
    s.elapsedMs = Date.now() - startedAt;
    setStats({ ...s });
  }

  function handleRevert(checkpointId: string) {
    const cp = useAgentStore.getState().byWorkspace[workspaceId]?.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;
    replaceFiles(workspaceId, cp.files);
    resetContainerMount();
    toast.success(`Reverted to "${cp.label}"`);
  }

  function newConversation() {
    if (busy) return;
    if (messages.length > 0) {
      saveCurrentSession(workspaceId);
      toast.success("Session saved to history");
    }
    clearConversation(workspaceId);
    setStats(null);
    setUndoStack([]);
    setRedoStack([]);
    convoRef.current = [];
  }

  // Undo: remove last user+assistant+tool messages
  function handleUndo() {
    if (busy || messages.length === 0) return;
    let idx = messages.length - 1;
    while (idx >= 0 && messages[idx].role !== "user") idx--;
    if (idx < 0) return;
    const kept = messages.slice(0, idx);
    const removed = messages.slice(idx);
    setUndoStack((s) => [...s, removed]);
    setRedoStack([]);
    commit(kept);
    toast.success("Undone last message");
  }

  // Redo: restore the last undone batch
  function handleRedo() {
    if (busy || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, last]);
    commit([...messages, ...last]);
    toast.success("Redone");
  }

  function handleExport() {
    downloadMarkdown(workspaceId);
    toast.success("Exported session as Markdown");
  }

  function handleModelOpen() {
    // Trigger the model selector by finding and clicking it
    const btn = document.querySelector("[data-agent-model-trigger]") as HTMLButtonElement | null;
    btn?.click();
  }

  function handleSlashFromPalette(cmd: string) {
    setInput(cmd + " ");
    inputRef.current?.focus();
  }

  function handleRestoreSession(restoredMessages: AgentMessage[]) {
    commit(restoredMessages);
    toast.success("Session restored");
  }

  // @ file mention handlers
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursorPos);
    const atMatch = /@([\w./\-]*)$/.exec(before);

    if (atMatch) {
      setMentionActive(true);
      setMentionQuery(atMatch[1]);
      mentionAnchorRef.current = cursorPos - atMatch[0].length;
      setMentionPos({ top: 48, left: Math.min(atMatch.index * 7, 120) });
    } else {
      setMentionActive(false);
    }
  }

  function handleMentionSelect(path: string) {
    const before = input.slice(0, mentionAnchorRef.current);
    const after = input.slice(inputRef.current?.selectionStart ?? input.length);
    setInput(before + "@" + path + " " + after.replace(/^[\w./\-]*/, ""));
    setMentionActive(false);

    if (!attachedFiles.includes(path)) {
      setAttachedFiles((prev) => [...prev, path]);
    }
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionActive) return; // let FileMentionPopup handle arrow/tab/enter

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Command palette commands
  const paletteCommands = useMemo(
    () =>
      buildAgentCommands({
        onNewSession: newConversation,
        onSessionList: () => setSessionsOpen(true),
        onExport: handleExport,
        onUndo: handleUndo,
        onRedo: handleRedo,
        onToggleThinking: () => setShowThinking((v) => !v),
        onToggleDetails: () => setShowToolDetails((v) => !v),
        onHelp: () => setHelpOpen(true),
        onSetMode: (m) => { setMode(m); toast.success(`Mode: ${m}`); },
        onSlash: handleSlashFromPalette,
        onModelList: handleModelOpen,
        thinkingVisible: showThinking,
        detailsVisible: showToolDetails,
        canUndo: messages.length > 0 && !busy,
        canRedo: undoStack.length > 0 && !busy,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showThinking, showToolDetails, messages.length, busy, undoStack.length],
  );

  async function send() {
    if (!ws || !model || !input.trim() || busy) return;
    let prompt = input.trim();

    // ! bash shortcut: run command directly without the agent
    if (prompt.startsWith("!")) {
      const cmd = prompt.slice(1).trim();
      if (!cmd) return;
      setInput("");
      const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: `!${cmd}`, createdAt: Date.now() };
      const toolCall: ToolCall = { id: crypto.randomUUID(), name: "run_bash", args: { command: cmd } };
      const result = await executeTool(workspaceId, toolCall);
      const toolMsg: AgentMessage = { id: crypto.randomUUID(), role: "tool", content: "", toolCall, toolResult: result, createdAt: Date.now() };
      commit([...messages, userMsg, toolMsg]);
      return;
    }

    // Slash command expansion
    for (const [cmd, expansion] of Object.entries(AGENT_SLASH)) {
      if (prompt === cmd || prompt.startsWith(cmd + " ")) {
        const extra = prompt.slice(cmd.length).trim();
        prompt = expansion + (extra ? `\n\nAdditional context: ${extra}` : "");
        break;
      }
    }

    // Attached files → inline context
    if (attachedFiles.length) {
      const contexts = attachedFiles
        .map((p) => ws.files.find((f) => f.path === p))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 5000)}\n--- end ---`)
        .join("\n\n");
      prompt = prompt + "\n\nAttached files:\n" + contexts;
      setAttachedFiles([]);
    }

    // @ mentions → also attach inline
    const atMentions = prompt.match(/@([\w./\-]+)/g);
    if (atMentions) {
      const mentioned = atMentions
        .map((m) => m.slice(1))
        .filter((p) => ws.files.some((f) => f.path === p))
        .filter((p) => !attachedFiles.includes(p));
      if (mentioned.length) {
        const contexts = mentioned
          .map((p) => ws.files.find((f) => f.path === p))
          .filter((f): f is NonNullable<typeof f> => Boolean(f))
          .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 5000)}\n--- end ---`)
          .join("\n\n");
        prompt = prompt + "\n\nReferenced files:\n" + contexts;
      }
    }

    if (mode === "autonomous") {
      pushCheckpoint(workspaceId, `Before: ${prompt.slice(0, 36)}${prompt.length > 36 ? "…" : ""}`, ws.files);
    }

    const seed = [...(useAgentStore.getState().byWorkspace[workspaceId]?.messages ?? [])];
    const userMsg: AgentMessage = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: Date.now() };
    commit([...seed, userMsg]);
    setInput("");
    setMentionActive(false);
    setBusy(true);
    abortedRef.current = false;
    abortRef.current = new AbortController();

    const startedAt = Date.now();
    statsRef.current = { turns: 0, tokensIn: 0, tokensOut: 0, costUSD: 0, elapsedMs: 0 };
    setStats({ ...statsRef.current });
    let fixAttempts = 0;
    const useNativeTools = supportsTools(model);
    const toolDefs = allToolDefinitions();
    const nativeTools = useNativeTools ? agentToolsAsNative(toolDefs) : undefined;

    // Recall relevant memories once and inject them into the system prompt for
    // this run (best-effort — memory never blocks the agent).
    let memoryContext = "";
    const memState = useMemoryStore.getState();
    if (memState.autoInject && memState.memories.length > 0) {
      try {
        const hits = await recall(prompt, memState.injectK);
        if (hits.length) {
          memoryContext = formatMemoriesForPrompt(hits);
          memState.bumpUsage(hits.map((h) => h.memory.id));
        }
      } catch { /* ignore — proceed without memory */ }
    }

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (abortedRef.current) break;
        const placeholderId = crypto.randomUUID();
        commit([...convoRef.current, { id: placeholderId, role: "assistant", content: "", createdAt: Date.now() }]);

        const apiMessages = [
          { role: "system" as const, content: buildSystemPrompt(ws, useNativeTools, toolDefs, memoryContext) },
          ...convoRef.current
            .filter((m) => m.id !== placeholderId)
            .map((m) => ({
              role: m.role === "tool" ? ("user" as const) : (m.role as "user" | "assistant"),
              content:
                m.role === "tool"
                  ? `Tool result for ${m.toolCall?.name}(${JSON.stringify(m.toolCall?.args ?? {})}):\n${stringifyResult(m.toolResult)}`
                  : m.content,
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
            maxTokens: AGENT_MAX_TOKENS,
            apiKey: byok[model.provider],
            ...(nativeTools ? { tools: nativeTools } : {}),
          }),
        });
        if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "request failed"));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const cleanText = parseStreamBuffer(raw).text;
          commit(convoRef.current.map((m) => (m.id === placeholderId ? { ...m, content: cleanText } : m)));
        }

        const { text: finalText, events } = parseStreamBuffer(raw);
        accumulateStats(apiMessages, finalText, events, startedAt);

        const toolMatch = findToolBlock(finalText);
        if (!toolMatch) break;

        const displayText = stripToolBlocks(finalText);
        commit(convoRef.current.map((m) => (m.id === placeholderId ? { ...m, content: displayText } : m)));

        const call = parseToolCall(toolMatch.json);
        if (!call) { toast.error("Couldn't parse the agent's tool call"); break; }

        const toolMsgId = crypto.randomUUID();
        const liveMode = useAgentStore.getState().mode;
        if (needsApproval(call.name, liveMode)) {
          const mutation = previewMutation(workspaceId, call) ?? undefined;
          commit([...convoRef.current, { id: toolMsgId, role: "tool", content: "", toolCall: call, pendingMutation: mutation, createdAt: Date.now() }]);
          const resolved = await waitForApproval(call.id);
          if (abortedRef.current) break;
          if (resolved === "rejected") {
            const rej: ToolResult = { ok: false, error: "User rejected this action — try a different approach or ask for guidance." };
            commit(convoRef.current.map((m) => (m.id === toolMsgId ? { ...m, toolResult: rej } : m)));
            continue;
          }
          const result = await executeTool(workspaceId, call);
          commit(convoRef.current.map((m) => (m.id === toolMsgId ? { ...m, toolResult: result } : m)));
          if (commandFailed(call, result)) fixAttempts += 1; else if (call.name === "run_bash" || call.name === "run_tests") fixAttempts = 0;
        } else {
          commit([...convoRef.current, { id: toolMsgId, role: "tool", content: "", toolCall: call, createdAt: Date.now() }]);
          const result = await executeTool(workspaceId, call);
          commit(convoRef.current.map((m) => (m.id === toolMsgId ? { ...m, toolResult: result } : m)));
          if (commandFailed(call, result)) fixAttempts += 1; else if (call.name === "run_bash" || call.name === "run_tests") fixAttempts = 0;
        }

        if (fixAttempts >= MAX_FIX_ATTEMPTS) {
          commit([...convoRef.current, {
            id: crypto.randomUUID(), role: "assistant", createdAt: Date.now(),
            content: `⚠️ Stopped after ${MAX_FIX_ATTEMPTS} failed test/command attempts. The last error is above — I need your guidance to continue.`,
          }]);
          break;
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
    abortedRef.current = true;
    abortRef.current?.abort();
    approvalResolversRef.current.forEach((resolve) => resolve("rejected"));
    approvalResolversRef.current.clear();
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center gap-2 min-w-0">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <div className="text-xs font-semibold shrink-0">Agent</div>
        <button
          onClick={newConversation}
          disabled={busy || messages.length === 0}
          title="New session (Ctrl+N)"
          className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1 shrink-0"
        >
          <Trash2 className="h-3 w-3" /> New
        </button>
        <button
          onClick={() => setPaletteOpen(true)}
          title="Command palette (Ctrl+K)"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
        >
          <CommandIcon className="h-3 w-3" />
        </button>
        <button
          onClick={() => setArenaOpen(true)}
          title="Comparison Arena — race this task across models"
          className="text-[11px] text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 shrink-0 font-medium"
        >
          <Swords className="h-3 w-3" /> Arena
        </button>
        <button
          onClick={() => setMemoryOpen(true)}
          title="Agent memory — what it remembers across sessions"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0"
        >
          <BrainCircuit className="h-3 w-3" /> Memory
          {memoryCount > 0 && (
            <span className="px-1 rounded bg-violet-500/20 text-violet-300 text-[9px] font-medium">{memoryCount}</span>
          )}
        </button>
        <AgentModelSelector className="ml-auto" />
      </div>

      {/* Toolbar row */}
      <div className="px-2.5 py-1 border-b flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setShowThinking((v) => !v)}
          title="Toggle thinking blocks (Ctrl+T)"
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
            showThinking ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Brain className="h-3 w-3" /> Think
        </button>
        <button
          onClick={() => setShowToolDetails((v) => !v)}
          title="Toggle tool details"
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
            showToolDetails ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {showToolDetails ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Details
        </button>
        <button
          onClick={handleUndo}
          disabled={busy || messages.length === 0}
          title="Undo (Ctrl+Z)"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
        >
          <Undo2 className="h-3 w-3" />
        </button>
        <button
          onClick={handleRedo}
          disabled={busy || undoStack.length === 0}
          title="Redo (Ctrl+Y)"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
        >
          <Redo2 className="h-3 w-3" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSessionsOpen(true)}
            title="Session history (Ctrl+L)"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <ChevronDown className="h-3 w-3" /> Sessions
          </button>
        </div>
      </div>

      <AgentControls mode={mode} onMode={setMode} busy={busy} stats={stats} checkpoints={checkpoints} onRevert={handleRevert} />
      <AgentPlan plan={plan} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 px-2">
            <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-50" />
            <p>Describe a task and the agent will plan, build, run, test, fix, and document it.</p>
            <div className="mt-3 text-[11px] text-muted-foreground/70 font-mono flex flex-wrap justify-center gap-x-2 gap-y-1">
              {Object.keys(AGENT_SLASH).map((cmd) => (
                <button key={cmd} onClick={() => { setInput(cmd + " "); inputRef.current?.focus(); }} className="hover:text-foreground transition-colors">
                  {cmd}
                </button>
              ))}
            </div>
            <div className="mt-4 text-[10px] text-muted-foreground/50 space-y-0.5">
              <p>Press <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">Ctrl+Shift+K</kbd> for agent commands</p>
              <p>Type <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">@file</kbd> to reference files · <kbd className="px-1 py-0.5 rounded border bg-muted font-mono text-[9px]">!cmd</kbd> to run bash</p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <AgentMessageView
              key={m.id}
              m={m}
              showThinking={showThinking}
              showToolDetails={showToolDetails}
              onApprove={() => m.toolCall && approveMutation(m.toolCall.id)}
              onReject={() => m.toolCall && rejectMutation(m.toolCall.id)}
              onAutoApprove={() => m.toolCall && enableAutoApprove(m.toolCall.id)}
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div
        className="border-t p-2 relative"
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
        {/* @ file mention popup */}
        {mentionActive && (
          <FileMentionPopup
            files={filePaths}
            query={mentionQuery}
            position={mentionPos}
            onSelect={handleMentionSelect}
            onClose={() => setMentionActive(false)}
          />
        )}

        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {attachedFiles.map((p) => (
              <div key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-card text-[11px] min-w-0">
                <FileCode2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate font-mono">{p}</span>
                <button onClick={() => setAttachedFiles((a) => a.filter((x) => x !== p))} className="opacity-60 hover:opacity-100">
                  <XCircle className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Card className="p-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Message… @ files · ! bash · / commands · Ctrl+K palette"
            className="border-0 resize-none focus-visible:ring-0 min-h-[48px] text-sm"
          />
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <button onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)" className="hover:text-foreground p-0.5 rounded">
                <CommandIcon className="h-3 w-3" />
              </button>
            </div>
            {busy ? (
              <Button size="sm" variant="destructive" onClick={stop} className="h-7 gap-1.5 text-xs px-3">
                <Square className="h-3 w-3" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={send} disabled={!input.trim() || !model} className="h-7 gap-1.5 text-xs px-3">
                <Send className="h-3 w-3" /> Send
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Overlays */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
      <SessionManager open={sessionsOpen} onClose={() => setSessionsOpen(false)} workspaceId={workspaceId} onRestore={handleRestoreSession} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ComparisonArena open={arenaOpen} onClose={() => setArenaOpen(false)} workspaceId={workspaceId} />
      <MemoryOverlay open={memoryOpen} onClose={() => setMemoryOpen(false)} />
    </div>
  );
}

function AgentMessageView({
  m,
  showThinking,
  showToolDetails,
  onApprove,
  onReject,
  onAutoApprove,
}: {
  m: AgentMessage;
  showThinking: boolean;
  showToolDetails: boolean;
  onApprove: () => void;
  onReject: () => void;
  onAutoApprove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (m.role === "tool") {
    if (m.pendingMutation && !m.pendingResolved) {
      return <DiffViewer mutation={m.pendingMutation} onApprove={onApprove} onReject={onReject} onAutoApprove={onAutoApprove} />;
    }
    const ok = m.toolResult?.ok;
    const Icon = m.toolCall?.name === "run_bash" || m.toolCall?.name === "run_tests" ? TermIcon : FileCode2;

    if (!showToolDetails) {
      return (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="font-mono">{m.toolCall?.name}</span>
          {ok ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> : <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-muted/30 text-xs min-w-0">
        <button onClick={() => setCollapsed((v) => !v)} className="w-full flex items-center gap-1.5 px-2.5 py-2 hover:bg-accent/50 min-w-0">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono font-medium shrink-0">{m.toolCall?.name}</span>
          <span className="text-muted-foreground truncate min-w-0 text-left text-[11px]">
            {Object.entries(m.toolCall?.args ?? {}).map(([k, v]) => `${k}=${typeof v === "string" ? JSON.stringify(v).slice(0, 24) : String(v).slice(0, 24)}`).join(", ")}
          </span>
          {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
        </button>
        {!collapsed && (
          <div className="px-2.5 pb-2.5">
            <pre className="text-[11px] font-mono bg-background/60 p-2.5 rounded-md border overflow-auto max-h-48 whitespace-pre-wrap break-all leading-relaxed">
              {m.toolResult?.ok
                ? typeof m.toolResult.output === "string"
                  ? m.toolResult.output
                  : JSON.stringify(m.toolResult.output, null, 2)
                : `Error: ${m.toolResult?.error ?? "(no result)"}`}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const isUser = m.role === "user";
  const { thinking, visible } = isUser ? { thinking: null, visible: m.content } : splitThinking(m.content);

  return (
    <div className="text-xs min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{isUser ? "You" : "Agent"}</div>
      {thinking && showThinking && (
        <div className="rounded-lg p-2 mb-1.5 bg-violet-500/5 border border-violet-500/20 text-[11px] text-violet-300 whitespace-pre-wrap break-words leading-relaxed">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-1">
            <Brain className="h-3 w-3" /> Thinking
          </div>
          {thinking}
        </div>
      )}
      <div className={cn(
        "rounded-lg p-2.5 whitespace-pre-wrap break-words leading-relaxed",
        isUser ? "bg-primary/10 border border-primary/20" : "bg-muted/40 border border-muted/60",
      )}>
        {visible || <span className="text-muted-foreground italic">…</span>}
      </div>
    </div>
  );
}
