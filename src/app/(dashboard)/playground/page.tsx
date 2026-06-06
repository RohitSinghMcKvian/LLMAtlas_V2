"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  Send, Square, Trash2, Settings, Sparkles, Zap, Clock,
  Copy, RefreshCw, Download, ChevronDown, Check, BookmarkPlus, Info,
  Pencil, Boxes, FileCode2, X, Share2, Play, ChevronUp, ArrowDown,
  History, Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ModelPicker } from "@/components/playground/model-picker";
import { ChatMessage } from "@/components/playground/message";
import { PlaygroundSettings } from "@/components/playground/settings-panel";
import { ArtifactPanel } from "@/components/playground/artifact-panel";
import { AttachmentTray } from "@/components/playground/attachment-tray";
import { HistoryRail } from "@/components/playground/history-rail";
import { StreamError, FallbackBanner } from "@/components/shared/stream-error";
import { VoiceInputButton } from "@/components/playground/voice-input";
import { FollowUpSuggestions } from "@/components/playground/follow-up-suggestions";
import { KeyboardShortcutsPanel, KeyboardShortcutsButton } from "@/components/playground/keyboard-shortcuts";
import { ConversationStats } from "@/components/playground/conversation-stats";
import { ExportMenu } from "@/components/playground/export-menu";
import { EnhancedEmptyState } from "@/components/playground/empty-state";
import { FormatToggle, formatSystemPromptSuffix, type ResponseFormat } from "@/components/playground/format-toggle";
import { TokenBudgetBar } from "@/components/playground/token-budget";
import { findModel, PROVIDERS, supportsVision } from "@/lib/models";
import {
  useSettingsStore, usePromptStore, useArtifactStore, useConversationStore, useProjectStore,
  useUsageStore,
  type Attachment,
} from "@/lib/store";
import { estimateTokens, formatLatency, cn, copyToClipboard } from "@/lib/utils";
import { parseStreamBuffer, type StreamEvent } from "@/lib/stream-events";
import { detectArtifacts, detectArtifactsStreaming } from "@/lib/artifacts";
import { attachmentsToContext } from "@/lib/attachments";
import { generateTitle } from "@/lib/auto-title";
import { encodeShare } from "@/lib/share";

// ─── System prompt presets ────────────────────────────────────────────────────
const PRESETS = [
  { label: "Assistant", icon: "🤖", prompt: "You are a friendly, expert AI assistant. Answer clearly and concisely. Use Markdown for formatting when helpful." },
  { label: "Coder",     icon: "💻", prompt: "You are an expert software engineer. Write clean, well-commented code. Always explain your reasoning. Prefer modern best practices." },
  { label: "Analyst",  icon: "📊", prompt: "You are a sharp data and business analyst. Be precise, cite assumptions, and structure your responses with clear sections and bullet points." },
  { label: "Teacher",  icon: "📚", prompt: "You are a patient, thorough tutor. Break down complex topics into simple steps. Use examples and analogies. Encourage the learner." },
  { label: "Creative", icon: "✨", prompt: "You are a creative writer. Be imaginative, vivid, and engaging. Match the tone and style requested. Avoid clichés." },
  { label: "Concise",  icon: "⚡", prompt: "Give the most concise, direct answer possible. No fluff, no filler. Use bullet points when helpful. Under 100 words unless more is needed." },
  { label: "Socratic", icon: "🏛️", prompt: "You are a Socratic tutor. Instead of giving direct answers, ask probing questions to guide the user to discover the answer themselves." },
  { label: "Researcher",icon: "🔬", prompt: "You are a rigorous research assistant. Cite sources when relevant, note uncertainty, distinguish facts from opinions, and consider multiple perspectives." },
  { label: "Debugger", icon: "🐛", prompt: "You are an expert debugger. Carefully read the code and error messages provided, identify root causes, and suggest minimal targeted fixes with explanations." },
  { label: "Security", icon: "🔒", prompt: "You are a cybersecurity expert. Identify vulnerabilities, suggest mitigations, and explain security concepts clearly with best-practice guidance." },
];

interface Msg {
  id: string;
  convMsgId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  latencyMs?: number;
  tokens?: number;
  error?: StreamEvent;
  fallback?: StreamEvent;
  attachments?: Attachment[];
  modelId?: string;
  timestamp?: number;
}

export default function PlaygroundPage() {
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const setDefaultModel = useSettingsStore((s) => s.setDefaultModel);
  const byok = useSettingsStore((s) => s.keys);
  const savePrompt = usePromptStore((s) => s.save);

  const [modelId, setModelId] = useState(defaultModel);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState(PRESETS[0].prompt);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [artifactMode, setArtifactMode] = useState(true);
  const [responseFormat, setResponseFormat] = useState<ResponseFormat>("markdown");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  const beginStream = useArtifactStore((s) => s.beginStream);
  const streamPush = useArtifactStore((s) => s.streamPush);
  const openArtifactId = useArtifactStore((s) => s.openId);
  const openArtifact = useArtifactStore((s) => s.open);
  const artifacts = useArtifactStore((s) => s.artifacts);
  const activeArtifact = artifacts.find((a) => a.id === openArtifactId) ?? null;

  const createConversation = useConversationStore((s) => s.createConversation);
  const appendConvMessage = useConversationStore((s) => s.appendMessage);
  const forkConvMessage = useConversationStore((s) => s.forkMessage);
  const updateConvMessage = useConversationStore((s) => s.updateMessage);
  const setActiveLeaf = useConversationStore((s) => s.setActiveLeaf);
  const getActiveThread = useConversationStore((s) => s.getActiveThread);
  const getSiblings = useConversationStore((s) => s.getSiblings);
  const conversation = useConversationStore((s) => s.conversations.find((c) => c.id === currentConvId));
  const projects = useProjectStore((s) => s.projects);
  const projectFor = conversation?.projectId ? projects.find((p) => p.id === conversation.projectId) : null;

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const model = findModel(modelId);
  const providerName = model ? PROVIDERS[model.provider].name : "";
  const tokenEstimate = estimateTokens(systemPrompt + messages.map((m) => m.content).join("\n") + input);

  // Last exchange for follow-up suggestions
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && !m.streaming && m.content);
  const lastUserMsg = (() => {
    if (!lastAssistantMsg) return null;
    const idx = messages.indexOf(lastAssistantMsg);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i];
    }
    return null;
  })();

  useEffect(() => { setDefaultModel(modelId); }, [modelId, setDefaultModel]);

  // URL param handling
  useEffect(() => {
    const url = new URL(window.location.href);
    const queryModel = url.searchParams.get("model");
    if (queryModel && findModel(queryModel)) setModelId(queryModel);
    const queryConv = url.searchParams.get("conv");
    if (queryConv) loadConversation(queryConv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Show scroll-to-bottom button when user scrolls up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ? key shows shortcuts (when not in a text input)
      if (e.key === "?" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      // Alt+N = new conversation
      if (e.altKey && e.key === "n") { e.preventDefault(); startNewConversation(); return; }
      // Alt+H = toggle history
      if (e.altKey && e.key === "h") { e.preventDefault(); setHistoryCollapsed((v) => !v); return; }
      // Alt+A = toggle artifacts
      if (e.altKey && e.key === "a") { e.preventDefault(); setArtifactMode((v) => !v); return; }
      // Alt+E = export
      if (e.altKey && e.key === "e") { e.preventDefault(); exportConversation(); return; }
      // Alt+S = share
      if (e.altKey && e.key === "s") { e.preventDefault(); shareConversation(); return; }
      // Ctrl/Cmd+R = regenerate
      if ((e.ctrlKey || e.metaKey) && e.key === "r" && !busy) { e.preventDefault(); regenerateLast(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, messages.length]);

  function loadConversation(convId: string) {
    setCurrentConvId(convId);
    const thread = getActiveThread(convId);
    const conv = useConversationStore.getState().conversations.find((c) => c.id === convId);
    if (conv) {
      setModelId(conv.modelId);
      setSystemPrompt(conv.systemPrompt);
    }
    setMessages(
      thread.map((m) => ({
        id: m.id,
        convMsgId: m.id,
        role: m.role,
        content: m.content,
        latencyMs: m.latencyMs,
        tokens: m.tokens,
        attachments: m.attachments,
        timestamp: m.createdAt,
      })),
    );
  }

  function startNewConversation() {
    setCurrentConvId(null);
    setMessages([]);
    setAttachments([]);
    setInput("");
    openArtifact(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("conv");
    window.history.replaceState({}, "", url.toString());
  }

  function handleSlashCommand(text: string): boolean {
    const cmd = text.trim();
    if (!cmd.startsWith("/")) return false;
    const [head] = cmd.split(/\s+/);
    switch (head) {
      case "/clear":
      case "/reset":
        setMessages([]); setInput(""); openArtifact(null); toast.success("Cleared local view");
        return true;
      case "/new":
        startNewConversation();
        return true;
      case "/export":
        exportConversation();
        setInput("");
        return true;
      case "/artifact": {
        const recent = artifacts[0];
        if (recent) { openArtifact(recent.id); toast.success(`Opened ${recent.title}`); }
        else toast.info("No artifacts yet");
        setInput("");
        return true;
      }
      case "/help":
        setMessages((prev) => [...prev, {
          id: nanoid(8),
          role: "assistant",
          content: "**Slash commands:**\n- `/new` — start a new conversation\n- `/clear` — clear the view\n- `/export` — download as markdown\n- `/artifact` — reopen latest artifact\n- `/help` — show this message\n\nPress `?` for keyboard shortcuts.",
          timestamp: Date.now(),
        }]);
        setInput("");
        return true;
      default:
        return false;
    }
  }

  async function send(overrideInput?: string, opts?: { forkFromParentId?: string | null }) {
    const text = (overrideInput ?? input).trim();
    if (!text || busy || !model) return;
    if (handleSlashCommand(text)) return;

    let convId = currentConvId;
    if (!convId) {
      const conv = createConversation({
        modelId: model.id,
        systemPrompt,
        title: text.length > 50 ? text.slice(0, 47) + "…" : text,
      });
      convId = conv.id;
      setCurrentConvId(convId);
      const url = new URL(window.location.href);
      url.searchParams.set("conv", convId);
      window.history.replaceState({}, "", url.toString());
    }

    const sentAttachments = attachments;
    const userInput = { role: "user" as const, content: text, modelId: model.id, attachments: sentAttachments };
    const userConvMsg = opts?.forkFromParentId !== undefined
      ? forkConvMessage(convId, opts.forkFromParentId, userInput)
      : appendConvMessage(convId, userInput);
    const placeholderConvMsg = appendConvMessage(convId, { role: "assistant", content: "", modelId: model.id, streaming: true });

    const ts = Date.now();
    const userMsg: Msg = { id: userConvMsg.id, convMsgId: userConvMsg.id, role: "user", content: text, attachments: sentAttachments, timestamp: ts };
    const placeholder: Msg = { id: placeholderConvMsg.id, convMsgId: placeholderConvMsg.id, role: "assistant", content: "", streaming: true, modelId: model.id, timestamp: ts };
    const history = [...messages, userMsg];
    setMessages([...history, placeholder]);
    setInput("");
    setAttachments([]);
    setBusy(true);

    const startTime = Date.now();
    const abort = new AbortController();
    abortRef.current = abort;

    // Build effective system prompt with format suffix
    const effectiveSystemPrompt = systemPrompt + formatSystemPromptSuffix(responseFormat);

    // Artifacts only stream when artifact-mode is on and we're emitting markdown.
    const wantArtifacts = artifactMode && responseFormat === "markdown";
    if (wantArtifacts) beginStream();
    let liveFirstId: string | undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          modelId,
          messages: buildApiMessages(history, effectiveSystemPrompt, undefined, projectFor),
          temperature,
          maxTokens,
          topP,
          frequencyPenalty: frequencyPenalty || undefined,
          presencePenalty: presencePenalty || undefined,
          apiKey: byok[model.provider],
          artifactMode: artifactMode && responseFormat === "markdown",
          attachments: sentAttachments,
        }),
      });

      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "Request failed")).slice(0, 200));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let cleanText = "";
      let errorEv: StreamEvent | undefined;
      let fallbackEv: StreamEvent | undefined;
      let frame = 0;
      const flush = () => {
        frame = 0;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.streaming) copy[copy.length - 1] = { ...last, content: cleanText, error: errorEv, fallback: fallbackEv };
          return copy;
        });
        // Build artifacts live in the panel as the model writes them.
        if (wantArtifacts) {
          for (const d of detectArtifactsStreaming(cleanText)) {
            const a = streamPush({
              externalId: d.externalId,
              title: d.title,
              kind: d.kind,
              language: d.language,
              content: d.content,
              messageId: placeholder.id,
              conversationId: convId,
            });
            if (!liveFirstId) {
              liveFirstId = a.id;
              if (!useArtifactStore.getState().openId) openArtifact(a.id);
            }
          }
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parsed = parseStreamBuffer(buf);
        cleanText = parsed.text;
        for (const ev of parsed.events) {
          if (ev.kind === "error") errorEv = ev;
          else if (ev.kind === "fallback") fallbackEv = ev;
          else if (ev.kind === "usage") {
            useUsageStore.getState().record({
              modelId: ev.modelId ?? model.id,
              promptTokens: ev.promptTokens,
              completionTokens: ev.completionTokens,
              costUSD: ev.costUSD,
            });
          }
        }
        if (!frame) frame = requestAnimationFrame(flush);
      }
      if (frame) cancelAnimationFrame(frame);
      flush();

      const elapsed = Date.now() - startTime;
      // Finalize artifacts from the fully-closed content (in-place for ones streamed this turn).
      if (wantArtifacts) {
        let firstArtifactId = liveFirstId;
        for (const d of detectArtifacts(cleanText)) {
          const a = streamPush({
            externalId: d.externalId,
            title: d.title,
            kind: d.kind,
            language: d.language,
            content: d.content,
            messageId: placeholder.id,
            conversationId: convId,
          });
          if (!firstArtifactId) firstArtifactId = a.id;
        }
        if (firstArtifactId && !useArtifactStore.getState().openId) openArtifact(firstArtifactId);
      }

      updateConvMessage(placeholderConvMsg.id, {
        content: cleanText,
        streaming: false,
        latencyMs: elapsed,
        tokens: estimateTokens(cleanText),
        errorMessage: errorEv?.message,
      });

      const convNow = useConversationStore.getState().conversations.find((c) => c.id === convId);
      if (convNow && convNow.title === (text.length > 50 ? text.slice(0, 47) + "…" : text) && cleanText.length > 20) {
        generateTitle(text, cleanText).then((title) => {
          if (title) useConversationStore.getState().renameConversation(convId!, title);
        }).catch(() => {});
      }

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) copy[copy.length - 1] = { ...last, streaming: false, latencyMs: elapsed, tokens: estimateTokens(cleanText), error: errorEv, fallback: fallbackEv, timestamp: Date.now() };
        return copy;
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      const fallbackEvent: StreamEvent = { kind: "error", code: "stream_aborted", message: msg };
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) copy[copy.length - 1] = { ...last, streaming: false, error: fallbackEvent };
        return copy;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setBusy(false); setMessages((prev) => prev.map((m) => m.streaming ? { ...m, streaming: false } : m)); }
  function clearAll() { setMessages([]); }

  function continueLast() {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    send("Continue from where you stopped.");
  }

  async function copyMessage(content: string, id: string) {
    await copyToClipboard(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  }

  function regenerateLast() {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    const idx = messages.lastIndexOf(lastUser);
    setMessages(messages.slice(0, idx));
    send(lastUser.content);
  }

  function startEdit(id: string, content: string) { setEditingId(id); setEditBuffer(content); }
  function cancelEdit() { setEditingId(null); setEditBuffer(""); }

  function submitEdit() {
    if (!editingId) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx < 0) return;
    const next = editBuffer.trim();
    if (!next) return cancelEdit();
    const editedMsg = messages[idx];
    const editedParentId = (() => {
      if (!editedMsg.convMsgId || !currentConvId) return undefined;
      const all = useConversationStore.getState().messages;
      const target = all.find((m) => m.id === editedMsg.convMsgId);
      return target?.parentId ?? null;
    })();
    setMessages(messages.slice(0, idx));
    setEditingId(null);
    setEditBuffer("");
    send(next, editedParentId !== undefined ? { forkFromParentId: editedParentId } : undefined);
  }

  function switchToBranch(msgConvId: string, siblingConvId: string) {
    if (!currentConvId) return;
    const allMsgs = useConversationStore.getState().messages.filter((m) => m.conversationId === currentConvId);
    const byParent = new Map<string | null, typeof allMsgs>();
    for (const m of allMsgs) {
      const k = m.parentId;
      const list = byParent.get(k) ?? [];
      list.push(m);
      byParent.set(k, list);
    }
    let leaf = siblingConvId;
    while (true) {
      const children = byParent.get(leaf);
      if (!children || children.length === 0) break;
      children.sort((a, b) => b.createdAt - a.createdAt);
      leaf = children[0].id;
    }
    setActiveLeaf(currentConvId, leaf);
    loadConversation(currentConvId);
  }

  function saveToLibrary(content: string) {
    savePrompt({ title: content.slice(0, 60) + (content.length > 60 ? "…" : ""), content, tags: ["playground", model?.vendor.toLowerCase() ?? ""] });
    toast.success("Saved to Prompt Library");
  }

  async function shareConversation() {
    if (!currentConvId) { toast.info("Send a message first to create a shareable conversation"); return; }
    const conv = useConversationStore.getState().conversations.find((c) => c.id === currentConvId);
    if (!conv) return;
    const thread = useConversationStore.getState().getActiveThread(currentConvId);
    const token = encodeShare(conv, thread);
    const url = `${window.location.origin}/share/${token}`;
    await copyToClipboard(url);
    toast.success("Share link copied to clipboard");
  }

  function exportConversation() {
    const lines: string[] = [`# Conversation — ${model?.name ?? modelId}`, `> System: ${systemPrompt}`, ""];
    for (const m of messages) {
      if (m.role === "system") continue;
      lines.push(`## ${m.role === "user" ? "You" : model?.name ?? "Assistant"}`);
      lines.push(m.content);
      if (m.latencyMs) lines.push(`\n*${formatLatency(m.latencyMs)} · ~${m.tokens ?? 0} tok*`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conversation-${Date.now()}.md`;
    a.click();
    toast.success("Exported as Markdown");
  }

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const activePreset = PRESETS.find(p => p.prompt === systemPrompt);
  const showArtifactPane = !!activeArtifact;
  const chatMaxWidth = showArtifactPane ? "max-w-3xl" : "max-w-4xl";

  // Conversation title for export
  const convTitle = conversation?.title ?? (messages[0]?.content?.slice(0, 40));

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className={cn("py-2.5 flex flex-wrap items-center gap-2 px-4", showArtifactPane ? "" : "container max-w-6xl")}>
          {/* Left group */}
          <div className="flex items-center gap-2 mr-auto min-w-0">
            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <h1 className="font-semibold text-sm hidden sm:block text-foreground/90">Playground</h1>

            {/* Persona preset selector */}
            <div className="relative">
              <button
                onClick={() => setShowPresets(p => !p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-muted/50 hover:bg-accent text-xs font-medium transition-colors"
              >
                <span>{activePreset?.icon ?? "🤖"}</span>
                <span className="hidden sm:inline max-w-[80px] truncate">{activePreset?.label ?? "Custom"}</span>
                <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
              </button>
              {showPresets && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPresets(false)} />
                  <div className="absolute top-full left-0 mt-1 z-40 bg-card border rounded-xl shadow-xl p-1 min-w-[220px] animate-in fade-in slide-in-from-top-1 duration-100">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Personas</p>
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setSystemPrompt(p.prompt); setShowPresets(false); }}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors",
                          p.prompt === systemPrompt && "bg-accent"
                        )}
                      >
                        <span className="text-base">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.label}</div>
                        </div>
                        {p.prompt === systemPrompt && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: model picker */}
          <ModelPicker value={modelId} onChange={setModelId} />

          {/* Model info badge */}
          {model && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-2.5 py-1.5 bg-card/50">
              <Info className="h-3 w-3" />
              <span>{model.context >= 1_000_000 ? `${(model.context/1_000_000).toFixed(1)}M` : `${Math.round(model.context/1000)}K`} ctx</span>
              <span className="opacity-40">·</span>
              <Zap className="h-3 w-3 text-amber-500" />
              <span>{model.speedScore}</span>
              <span className="opacity-40">·</span>
              <span className="text-amber-500">★</span>
              <span>{model.benchmark}</span>
            </div>
          )}

          {/* Format toggle */}
          <FormatToggle value={responseFormat} onChange={setResponseFormat} />

          {/* Artifact mode toggle */}
          <button
            onClick={() => setArtifactMode((v) => !v)}
            title={artifactMode ? "Artifact mode on — model emits previewable blocks" : "Artifact mode off"}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border text-xs font-medium transition-colors",
              artifactMode ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-accent",
            )}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Artifacts</span>
          </button>

          {/* Open most-recent artifact */}
          {artifacts.length > 0 && !showArtifactPane && (
            <button
              onClick={() => openArtifact(artifacts[0].id)}
              title="Reopen latest artifact"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border text-xs font-medium bg-muted/30 hover:bg-accent text-muted-foreground transition-colors"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline truncate max-w-[120px]">{artifacts[0].title}</span>
            </button>
          )}

          {/* Settings */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Settings" className="h-9 w-9" title="Generation settings">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader><SheetTitle>Generation Settings</SheetTitle></SheetHeader>
              <div className="mt-6">
                <PlaygroundSettings
                  systemPrompt={systemPrompt}
                  temperature={temperature}
                  maxTokens={maxTokens}
                  topP={topP}
                  frequencyPenalty={frequencyPenalty}
                  presencePenalty={presencePenalty}
                  onChange={(next) => {
                    if (next.systemPrompt !== undefined) setSystemPrompt(next.systemPrompt);
                    if (next.temperature !== undefined) setTemperature(next.temperature);
                    if (next.maxTokens !== undefined) setMaxTokens(next.maxTokens);
                    if (next.topP !== undefined) setTopP(next.topP);
                    if (next.frequencyPenalty !== undefined) setFrequencyPenalty(next.frequencyPenalty);
                    if (next.presencePenalty !== undefined) setPresencePenalty(next.presencePenalty);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Share */}
          {messages.length > 0 && (
            <Button
              variant="ghost" size="icon"
              onClick={shareConversation}
              className="h-9 w-9"
              title="Copy share link (Alt+S)"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}

          {/* Export menu */}
          <ExportMenu
            messages={messages}
            modelName={model?.name}
            systemPrompt={systemPrompt}
            conversationTitle={convTitle}
            disabled={messages.length === 0}
          />

          {/* New conversation */}
          <Button
            variant="ghost" size="icon"
            onClick={startNewConversation}
            className="h-9 w-9"
            title="New conversation (Alt+N)"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Clear */}
          <Button variant="ghost" size="icon" onClick={clearAll} className="h-9 w-9" title="Clear view">
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Keyboard shortcuts */}
          <KeyboardShortcutsButton onClick={() => setShowShortcuts(true)} />
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* History rail */}
        <HistoryRail
          collapsed={historyCollapsed}
          onToggleCollapsed={() => setHistoryCollapsed((v) => !v)}
          currentId={currentConvId}
          onSelect={(id) => {
            loadConversation(id);
            const url = new URL(window.location.href);
            url.searchParams.set("conv", id);
            window.history.replaceState({}, "", url.toString());
          }}
          onNew={startNewConversation}
        />

        <div className="flex flex-col flex-1 min-w-0 relative">
          {/* ─── Chat messages ─── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            <div className={cn("container", chatMaxWidth)}>
              {messages.length === 0 ? (
                <EnhancedEmptyState
                  modelName={model?.name ?? ""}
                  providerName={providerName}
                  onPrompt={(p) => { setInput(p); textareaRef.current?.focus(); }}
                />
              ) : (
                <div className="pb-4">
                  {messages.map((m, i) => {
                    const msgArtifacts = artifacts.filter((a) => a.messageId === m.id);
                    const isEditing = editingId === m.id;
                    const siblings = m.convMsgId ? getSiblings(m.convMsgId) : [];
                    const siblingIdx = siblings.findIndex((s) => s.id === m.convMsgId);
                    const hasBranches = siblings.length > 1;
                    const isLastAssistant = m.role === "assistant" && i === messages.length - 1 && !m.streaming && !!m.content;
                    return (
                      <div key={m.id} className="group relative">
                        {m.fallback && (
                          <div className="px-4 pt-3">
                            <FallbackBanner event={m.fallback} />
                          </div>
                        )}

                        {/* Branch navigator */}
                        {hasBranches && m.convMsgId && (
                          <div className="px-4 md:px-6 pt-2 -mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <button
                              disabled={siblingIdx <= 0}
                              onClick={() => switchToBranch(m.convMsgId!, siblings[siblingIdx - 1].id)}
                              className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                              title="Previous branch"
                            >
                              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                            </button>
                            <span className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">
                              {siblingIdx + 1}/{siblings.length}
                            </span>
                            <button
                              disabled={siblingIdx >= siblings.length - 1}
                              onClick={() => switchToBranch(m.convMsgId!, siblings[siblingIdx + 1].id)}
                              className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                              title="Next branch"
                            >
                              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                            </button>
                            <span className="opacity-60">branches</span>
                          </div>
                        )}

                        {/* Edit mode */}
                        {isEditing ? (
                          <div className="px-4 py-3 flex gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <textarea
                                value={editBuffer}
                                onChange={(e) => setEditBuffer(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") cancelEdit();
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitEdit(); }
                                }}
                                className="w-full text-sm p-3 rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                <Button size="sm" onClick={submitEdit} disabled={!editBuffer.trim()}>Save &amp; Resend</Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">⌘/Ctrl+Enter to save · Esc to cancel</p>
                            </div>
                          </div>
                        ) : (
                          <ChatMessage
                            role={m.role}
                            content={m.content}
                            streaming={m.streaming}
                            timestamp={m.timestamp}
                            meta={
                              m.role === "assistant" && (m.latencyMs || m.tokens)
                                ? [
                                    m.latencyMs && formatLatency(m.latencyMs),
                                    m.tokens && `~${m.tokens} tok`,
                                    m.modelId && findModel(m.modelId)?.name,
                                  ].filter(Boolean).join(" · ")
                                : undefined
                            }
                          />
                        )}

                        {/* Inline artifact affordance */}
                        {msgArtifacts.length > 0 && !m.streaming && (
                          <div className="px-4 md:px-6 -mt-1 pb-3 flex flex-wrap gap-2">
                            {msgArtifacts.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => openArtifact(a.id)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-accent transition-all",
                                  openArtifactId === a.id
                                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm shadow-primary/10"
                                    : "bg-card text-muted-foreground hover:border-primary/20",
                                )}
                                title={`${a.kind} artifact · v${a.versions.length}`}
                              >
                                <FileCode2 className="h-3.5 w-3.5" />
                                <span className="font-medium truncate max-w-[180px]">{a.title}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 h-4 ml-0.5">v{a.versions.length}</Badge>
                              </button>
                            ))}
                          </div>
                        )}

                        {m.error && !m.streaming && (
                          <div className="px-4 pb-3">
                            <StreamError event={m.error} onRetry={() => regenerateLast()} />
                          </div>
                        )}

                        {/* Follow-up suggestions below last assistant message */}
                        {isLastAssistant && !busy && lastUserMsg && (
                          <FollowUpSuggestions
                            lastUserMessage={lastUserMsg.content}
                            lastAssistantMessage={m.content}
                            modelId={modelId}
                            apiKey={byok[model?.provider ?? "groq"]}
                            onSelect={(p) => { setInput(p); textareaRef.current?.focus(); }}
                            disabled={busy}
                          />
                        )}

                        {/* Message action bar — hover reveal */}
                        {!m.streaming && m.content && !isEditing && (
                          <div className={cn(
                            "absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity",
                            "flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border rounded-lg p-0.5 shadow-sm",
                          )}>
                            <button
                              onClick={() => copyMessage(m.content, m.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="Copy"
                            >
                              {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            {m.role === "assistant" && i === messages.length - 1 && !busy && (
                              <button
                                onClick={regenerateLast}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                title="Regenerate (⌘R)"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {m.role === "assistant" && m.modelId && m.modelId !== modelId && (
                              <button
                                onClick={() => { setModelId(m.modelId!); toast.success(`Pinned ${findModel(m.modelId!)?.name ?? m.modelId}`); }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                title={`Use ${findModel(m.modelId)?.name ?? m.modelId} from now on`}
                              >
                                <Boxes className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {m.role === "user" && (
                              <>
                                <button
                                  onClick={() => startEdit(m.id, m.content)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  title="Edit and resend"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => saveToLibrary(m.content)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  title="Save to Prompt Library"
                                >
                                  <BookmarkPlus className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Scroll to bottom FAB */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-36 right-6 z-20 h-9 w-9 rounded-full bg-card border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all animate-in fade-in zoom-in-95 duration-150"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          {/* Conversation stats bar */}
          <ConversationStats messages={messages} modelName={model?.name} />

          {/* ─── Composer ─── */}
          <div className="border-t bg-background/95 backdrop-blur-sm">
            <div className={cn("container py-3", chatMaxWidth)}>
              <Card className="p-0 shadow-lg ring-1 ring-primary/10 overflow-hidden bg-card">
                <AttachmentTray
                  attachments={attachments}
                  onAdd={(a) => setAttachments((prev) => [...prev, a])}
                  onRemove={(id) => setAttachments((prev) => prev.filter((x) => x.id !== id))}
                  disabled={busy}
                />
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      const it = items[i];
                      if (it.kind === "file" && it.type.startsWith("image/")) {
                        const f = it.getAsFile();
                        if (f) {
                          import("@/lib/attachments").then(({ fileToAttachment }) =>
                            fileToAttachment(f).then((a) => setAttachments((p) => [...p, a])).catch(() => {})
                          );
                        }
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder={`Message ${model?.name ?? "the model"}…  (Shift+Enter for newline, ? for shortcuts)`}
                  className="border-0 resize-none focus-visible:ring-0 min-h-[64px] max-h-[200px] rounded-none text-sm"
                />
                <div className="flex items-center gap-2 px-3 pb-2 pt-1">
                  {/* Left side: provider info + token budget */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-1 min-w-0">
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span className="hidden sm:inline truncate max-w-[80px]">{providerName}</span>
                    </span>
                    <span className="hidden md:flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tokenEstimate.toLocaleString()} tok
                    </span>
                    {model && (
                      <div className="hidden lg:block flex-1 max-w-[140px]">
                        <TokenBudgetBar used={tokenEstimate} total={model.context} />
                      </div>
                    )}
                  </div>

                  {/* Right side: voice + actions */}
                  <div className="flex items-center gap-1">
                    <VoiceInputButton
                      onTranscript={(t) => setInput((prev) => prev ? prev + " " + t : t)}
                      disabled={busy}
                    />
                    {busy ? (
                      <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5 h-8">
                        <Square className="h-3.5 w-3.5" /> Stop
                      </Button>
                    ) : (
                      <>
                        {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].content && !input.trim() && (
                          <Button size="sm" variant="outline" onClick={continueLast} className="gap-1.5 h-8">
                            <Play className="h-3.5 w-3.5" /> Continue
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => send()}
                          disabled={!input.trim() || !model}
                          className="gap-1.5 h-8 px-3"
                        >
                          <Send className="h-3.5 w-3.5" /> Send
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className="text-[10px] text-muted-foreground/50">
                  Enter to send · Shift+Enter for newline · ? for shortcuts
                </p>
                {responseFormat !== "markdown" && (
                  <Badge variant="outline" className="text-[10px] h-4">
                    {responseFormat === "plain" ? "Plain text mode" : "JSON mode"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>{/* /chat column */}

        {/* ─── Artifact panel ─── */}
        {showArtifactPane && activeArtifact && (
          <aside className="flex flex-col fixed inset-0 z-40 bg-background md:static md:inset-auto md:z-auto md:w-[42%] md:min-w-[400px] md:max-w-[640px] xl:max-w-[760px]">
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => openArtifact(null)}
            />
          </aside>
        )}
      </div>{/* /body row */}

      {/* ─── Keyboard shortcuts overlay ─── */}
      <KeyboardShortcutsPanel
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

// Build messages payload for /api/chat
function buildApiMessages(
  history: Msg[],
  systemPrompt: string,
  attachments: Attachment[] | undefined,
  project: { systemPrompt: string; files: Array<{ name: string; extractedText: string }> } | null | undefined,
): Array<{ role: string; content: string }> {
  let system = systemPrompt;
  if (project) {
    const knowledge = project.files
      .map((f) => `--- ${f.name} ---\n${f.extractedText.slice(0, 8000)}`)
      .join("\n\n");
    if (knowledge) system += `\n\nProject knowledge:\n${knowledge}`;
  }
  const msgs: Array<{ role: string; content: string }> = [{ role: "system", content: system }];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const isLastUser = i === history.length - 1 && m.role === "user";
    let content = m.content;
    if (isLastUser && attachments && attachments.length) {
      content += attachmentsToContext(attachments);
    } else if (m.attachments && m.attachments.length) {
      content += attachmentsToContext(m.attachments);
    }
    msgs.push({ role: m.role, content });
  }
  return msgs;
}
