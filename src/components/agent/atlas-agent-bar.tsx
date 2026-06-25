"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Agent bar — the platform-wide assistant (multi-agent).
//
// A corner-docked, brand-marked command surface mounted in the dashboard shell.
// It drives the SAME headless brain (runAgentLoop) as /code, but with the full
// platform tool pack: navigate, find/inspect/compare models, open the playground,
// estimate cost, open lessons, save prompts, set default model + theme, shared
// memory — and `delegate`, which fans complex requests out to parallel read-only
// sub-agents (rendered live). One agent spanning Learn / Research / Develop.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Square, X, Wrench, CheckCircle2, XCircle, Loader2, Trash2,
  Search, GitCompare, GraduationCap, Network, ChevronDown, Wand2, History, Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { HexMark } from "@/components/brand/logo";
import { VoiceInputButton } from "@/components/playground/voice-input";
import { findModel, supportsTools } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";
import { runAgentLoop } from "@/lib/brain/loop";
import { stripToolBlocks } from "@/lib/brain/parse";
import { recall, formatMemoriesForPrompt, useMemoryStore } from "@/lib/brain/memory";
import { PLATFORM_TOOLS, buildAtlasSystemPrompt, makePlatformExecutor } from "@/lib/brain/platform-tools";
import { runSubagents, type SubResult } from "@/lib/brain/atlas-orchestrator";
import { useAtlasAgentStore, usePendingCompare, type AtlasMessage, type SubagentState } from "@/lib/brain/atlas-agent-store";
import {
  useSkillStore, allSkills, resolveActiveSkill, formatSkillForPrompt, type SkillDef,
} from "@/lib/brain/skills";
import { useTraceStore } from "@/lib/brain/traces";
import { TraceViewer } from "@/components/agent/trace-viewer";
import { cn } from "@/lib/utils";

const SUGGESTIONS: Array<{ label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = [
  { label: "Find the cheapest vision model", icon: Search, accent: "text-sky-400 group-hover:bg-sky-500/15" },
  { label: "Compare Llama 3.3 70B and DeepSeek V4", icon: GitCompare, accent: "text-violet-400 group-hover:bg-violet-500/15" },
  { label: "Research & recommend the best free coding model", icon: Network, accent: "text-emerald-400 group-hover:bg-emerald-500/15" },
  { label: "What should I learn about RAG?", icon: GraduationCap, accent: "text-amber-400 group-hover:bg-amber-500/15" },
];

export function AtlasAgentBar() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useAtlasAgentStore((s) => s.open);
  const busy = useAtlasAgentStore((s) => s.busy);
  const messages = useAtlasAgentStore((s) => s.messages);
  const setOpen = useAtlasAgentStore((s) => s.setOpen);
  const setBusy = useAtlasAgentStore((s) => s.setBusy);
  const reset = useAtlasAgentStore((s) => s.reset);
  const setCompare = usePendingCompare((s) => s.set);

  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const byok = useSettingsStore((s) => s.keys);

  const userSkills = useSkillStore((s) => s.skills);
  const skillActiveId = useSkillStore((s) => s.activeId);
  const skillAutoSelect = useSkillStore((s) => s.autoSelect);
  const setSkillActive = useSkillStore((s) => s.setActive);
  const setSkillAuto = useSkillStore((s) => s.setAutoSelect);
  const pinnedSkill = skillActiveId ? allSkills(userSkills).find((s) => s.id === skillActiveId) ?? null : null;

  const [input, setInput] = useState("");
  const [hovered, setHovered] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showTraces, setShowTraces] = useState(false);
  const traceCount = useTraceStore((s) => s.traces.length);
  const modelName = findModel(defaultModel)?.name ?? defaultModel;
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ⌘J / Ctrl+J toggles; Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "j" || e.key === "J") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useAtlasAgentStore.getState().setOpen(!useAtlasAgentStore.getState().open);
      }
      if (e.key === "Escape" && useAtlasAgentStore.getState().open) useAtlasAgentStore.getState().setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    const model = findModel(defaultModel);
    if (!model) { toast.error("Select a model in Settings first"); return; }

    const st = useAtlasAgentStore.getState();
    const runStartIndex = st.messages.length; // for the trace snapshot
    const startedAt = Date.now();
    let runCost = 0;
    let runToolCalls = 0;
    st.addUser(prompt);
    setInput("");
    setBusy(true);
    abortRef.current = new AbortController();

    const useNative = supportsTools(model);

    // Skill: pinned wins, else auto-pick by triggers. Shapes the system prompt.
    const activeSkill = resolveActiveSkill(prompt, userSkills, skillActiveId, skillAutoSelect);
    const skillInstructions = activeSkill ? formatSkillForPrompt(activeSkill) : undefined;

    // Shared memory: recall + inject (same store as /code).
    let memoryContext = "";
    const ms = useMemoryStore.getState();
    if (ms.autoInject && ms.memories.length > 0) {
      try {
        const hits = await recall(prompt, ms.injectK);
        if (hits.length) { memoryContext = formatMemoriesForPrompt(hits); ms.bumpUsage(hits.map((h) => h.memory.id)); }
      } catch { /* best-effort */ }
    }

    // Seed the loop from the visible text conversation (tool rows excluded).
    const seed = useAtlasAgentStore.getState().messages
      .filter((m) => m.role !== "tool" && m.content)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let curAssist: string | null = null;
    let curTool: string | null = null;
    // Track delegation so we can guarantee a final synthesis even if a weak
    // (keyless) model skips its post-delegate summary turn. A holder object is
    // used so closure assignments aren't flow-narrowed away by the compiler.
    const delegation: { results: SubResult[] | null; synthesized: boolean } = { results: null, synthesized: false };

    // Platform executor with delegation wired to the sub-agent orchestrator.
    const executor = makePlatformExecutor({
      navigate: (r) => router.push(r),
      setCompare,
      setTheme: (t) => setTheme(t),
      delegate: async (subtasks) => {
        const toolId = curTool;
        let states: SubagentState[] = subtasks.map((s, i) => ({
          id: `sa${i}`, role: s.role, task: s.task, status: "running", toolCount: 0,
        }));
        if (toolId) useAtlasAgentStore.getState().setToolSubagents(toolId, states);
        delegation.results = await runSubagents(subtasks, {
          modelId: model.id,
          apiKey: byok[model.provider],
          useNativeTools: useNative,
          signal: abortRef.current?.signal,
          onUpdate: (i, patch) => {
            states = states.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
            if (toolId) useAtlasAgentStore.getState().setToolSubagents(toolId, states);
          },
        });
        return delegation.results;
      },
    });

    try {
      await runAgentLoop({
        modelId: model.id,
        apiKey: byok[model.provider],
        systemPrompt: buildAtlasSystemPrompt(useNative, memoryContext, skillInstructions),
        messages: seed,
        toolDefs: PLATFORM_TOOLS,
        useNativeTools: useNative,
        executeTool: executor,
        signal: abortRef.current.signal,
        onEvent: (e) => {
          const s = useAtlasAgentStore.getState();
          switch (e.type) {
            case "turn_start":
              curAssist = null;
              break;
            case "text": {
              const clean = stripToolBlocks(e.text).trim();
              if (!clean) break;
              if (delegation.results) delegation.synthesized = true;
              if (!curAssist) { curAssist = nanoid(8); s.addAssistant(curAssist); }
              s.updateMessage(curAssist, clean);
              break;
            }
            case "assistant_done":
              if (e.text.trim() && delegation.results) delegation.synthesized = true;
              if (curAssist) s.updateMessage(curAssist, e.text);
              else if (e.text) { const id = nanoid(8); s.addAssistant(id); s.updateMessage(id, e.text); }
              break;
            case "tool_call":
              curTool = s.addTool(e.call.name, e.call.args);
              runToolCalls += 1;
              break;
            case "tool_result":
              if (curTool) { s.resolveTool(curTool, e.result.ok); curTool = null; }
              break;
            case "usage":
              runCost += e.costUSD;
              break;
            case "error":
              toast.error(e.message);
              break;
          }
        },
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error(e instanceof Error ? e.message : "Atlas failed");
    } finally {
      // Guarantee closure: if we delegated but the model never wrote a final
      // synthesis, compose one from the sub-agents' real findings.
      if (delegation.results && !delegation.synthesized && !abortRef.current?.signal.aborted) {
        const lines = delegation.results
          .map((r) => `**${r.role}** — ${r.summary}`)
          .join("\n\n");
        const id = nanoid(8);
        const s = useAtlasAgentStore.getState();
        s.addAssistant(id);
        s.updateMessage(id, `Here's what my sub-agents found:\n\n${lines}`);
      }
      useAtlasAgentStore.getState().pruneEmpty();
      // Record a replayable trace of this run (skip if aborted/empty).
      if (!abortRef.current?.signal.aborted) {
        const runMsgs = useAtlasAgentStore.getState().messages.slice(runStartIndex);
        if (runMsgs.length > 1) {
          useTraceStore.getState().record({
            title: prompt.length > 60 ? prompt.slice(0, 57) + "…" : prompt,
            modelId: model.id,
            modelName: model.name,
            skillName: activeSkill?.name,
            messages: runMsgs,
            toolCalls: runToolCalls,
            costUSD: runCost,
            durationMs: Date.now() - startedAt,
          });
        }
      }
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  const showTyping = busy && (() => {
    const last = messages[messages.length - 1];
    return !last || last.role !== "assistant" || !last.content;
  })();

  return (
    <>
      {/* Corner-docked launcher — brand mark tucked into the edge, slides out on hover */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-20 right-0 z-[60]"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <motion.button
              onClick={() => setOpen(true)}
              onHoverStart={() => setHovered(true)}
              onHoverEnd={() => setHovered(false)}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              title="Ask Atlas (⌘J)"
              aria-label="Ask Atlas"
              animate={{ x: hovered ? 0 : 28 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="group relative flex items-center gap-2.5 h-12 pl-2.5 pr-5 rounded-l-2xl border border-r-0 bg-card/95 backdrop-blur-xl shadow-lg shadow-black/10 ring-1 ring-black/5 dark:ring-white/5"
            >
              <span className="relative flex items-center justify-center">
                <HexMark size={28} glow shimmer />
                {busy && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-card">
                    <motion.span
                      className="absolute inset-0 rounded-full bg-violet-500"
                      animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  </span>
                )}
              </span>
              <AnimatePresence initial={false}>
                {hovered && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden whitespace-nowrap text-sm font-semibold flex items-center gap-2"
                  >
                    Ask Atlas
                    <kbd className="text-[9px] font-mono bg-muted rounded px-1 py-0.5 text-muted-foreground">⌘J</kbd>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent panel */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[60] sm:bg-transparent bg-black/40 sm:pointer-events-none sm:backdrop-blur-0 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="pointer-events-auto fixed sm:bottom-6 sm:right-6 bottom-0 right-0 left-0 sm:left-auto sm:w-[420px] w-full sm:rounded-2xl rounded-t-2xl border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/30 flex flex-col sm:max-h-[74vh] max-h-[84vh] overflow-hidden ring-1 ring-black/5"
            >
              {/* Header */}
              <div className="relative px-3.5 py-3 border-b shrink-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/[0.04] to-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <HexMark size={28} glow />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                      Atlas
                      <span className="text-[9px] font-normal text-muted-foreground">platform agent</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate font-mono flex items-center gap-1.5">
                      {busy ? <span className="flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> working…</span> : modelName}
                      <span className="opacity-40">·</span>
                      <button
                        onClick={() => setShowSkills((v) => !v)}
                        className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                        title="Active skill"
                      >
                        <Wand2 className="h-2.5 w-2.5 text-violet-400" />
                        <span className="not-italic font-sans">{pinnedSkill ? pinnedSkill.name : skillAutoSelect ? "Auto skill" : "No skill"}</span>
                        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                      </button>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button onClick={() => setShowTraces(true)} title="Run history & replay" className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent">
                      <History className="h-3.5 w-3.5" />
                      {traceCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-violet-500 text-white text-[8px] font-bold flex items-center justify-center">{traceCount}</span>}
                    </button>
                    {messages.length > 0 && (
                      <button onClick={reset} disabled={busy} title="Clear conversation" className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Close (Esc)">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Skill picker */}
                <AnimatePresence>
                  {showSkills && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSkills(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute left-3 right-3 top-full mt-1 z-20 rounded-xl border bg-popover shadow-xl p-1.5 max-h-[260px] overflow-y-auto"
                      >
                        <div className="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Skill — shapes how Atlas works</div>
                        <SkillOption label="Auto-select" sub="Pick the best skill per request" active={!pinnedSkill && skillAutoSelect} onClick={() => { setSkillAuto(true); setSkillActive(null); setShowSkills(false); }} />
                        <SkillOption label="No skill" sub="Plain agent, no specialisation" active={!pinnedSkill && !skillAutoSelect} onClick={() => { setSkillAuto(false); setSkillActive(null); setShowSkills(false); }} />
                        <div className="my-1 border-t" />
                        {allSkills(userSkills).map((sk) => (
                          <SkillOption
                            key={sk.id}
                            label={sk.name}
                            sub={sk.description}
                            badge={sk.builtin ? undefined : "custom"}
                            active={pinnedSkill?.id === sk.id}
                            onClick={() => { setSkillActive(sk.id); setShowSkills(false); }}
                          />
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3.5 space-y-3 min-h-[220px]">
                {messages.length === 0 ? (
                  <div className="py-3">
                    <div className="text-center mb-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center mb-2.5"
                      >
                        <HexMark size={46} glow shimmer />
                      </motion.div>
                      <p className="text-sm font-semibold">How can I help?</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">I can run the whole platform — and split hard tasks across sub-agents.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SUGGESTIONS.map((s, i) => (
                        <motion.button
                          key={s.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i }}
                          onClick={() => send(s.label)}
                          className="group flex items-center gap-2.5 text-left text-xs px-3 py-2.5 rounded-xl border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                        >
                          <span className={cn("h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 transition-colors", s.accent)}>
                            <s.icon className="h-3.5 w-3.5 transition-colors" />
                          </span>
                          <span className="flex-1">{s.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((m) => <AtlasRow key={m.id} m={m} />)}
                    {showTyping && <TypingDots />}
                  </>
                )}
              </div>

              {/* Input */}
              <div className="border-t p-2.5 shrink-0 bg-card/60">
                <div className="rounded-2xl border bg-background p-1.5 pl-2 flex items-end gap-1 focus-within:ring-2 focus-within:ring-violet-500/30 transition-shadow">
                  <div className="pb-1 shrink-0">
                    <VoiceInputButton onTranscript={(t) => setInput((p) => (p ? `${p} ${t}` : t))} disabled={busy} />
                  </div>
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    placeholder="Ask Atlas anything…"
                    className="border-0 resize-none focus-visible:ring-0 min-h-[36px] max-h-28 text-sm py-1.5 px-0 bg-transparent"
                  />
                  {busy ? (
                    <Button size="sm" variant="destructive" onClick={stop} className="h-8 w-8 p-0 shrink-0 rounded-xl"><Square className="h-3.5 w-3.5" /></Button>
                  ) : (
                    <Button size="sm" onClick={() => send()} disabled={!input.trim()} className="h-8 w-8 p-0 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 border-0"><Send className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground/70 text-center mt-1.5">Enter to send · Shift+Enter for newline · Esc to close</p>
              </div>

              {/* Run history & replay overlay (covers the panel) */}
              <TraceViewer open={showTraces} onClose={() => setShowTraces(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SkillOption({ label, sub, active, badge, onClick }: { label: string; sub: string; active: boolean; badge?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
        active ? "bg-violet-500/10" : "hover:bg-accent",
      )}
    >
      <Wand2 className={cn("h-3.5 w-3.5 shrink-0", active ? "text-violet-400" : "text-muted-foreground")} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {label}
          {badge && <span className="text-[8px] uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-muted-foreground">{badge}</span>}
        </span>
        <span className="block text-[10px] text-muted-foreground truncate">{sub}</span>
      </span>
      {active && <Check className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
    </button>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2">
      <HexMark size={22} glow />
      <div className="inline-flex items-center gap-1 rounded-2xl bg-muted/50 border border-muted px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function AtlasRow({ m }: { m: AtlasMessage }) {
  if (m.role === "tool") {
    const isDelegate = m.tool?.name === "delegate";
    const subagents = m.tool?.subagents;
    const argStr = Object.entries(m.tool?.args ?? {})
      .filter(([k]) => k !== "subtasks")
      .map(([k, v]) => `${k}=${typeof v === "string" ? v.slice(0, 28) : JSON.stringify(v).slice(0, 28)}`)
      .join(", ");
    const pending = m.tool?.ok === undefined;
    return (
      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="ml-7 space-y-1.5">
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-mono max-w-full",
            pending ? "bg-muted/40 border-muted text-muted-foreground"
              : m.tool?.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-500",
          )}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              : m.tool?.ok ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
            {isDelegate ? <Network className="h-2.5 w-2.5 shrink-0 opacity-70" /> : <Wrench className="h-2.5 w-2.5 shrink-0 opacity-70" />}
            <span className="font-semibold shrink-0">{m.tool?.name}</span>
            {isDelegate && subagents
              ? <span className="opacity-70">{subagents.length} sub-agent{subagents.length > 1 ? "s" : ""}</span>
              : argStr && <span className="truncate opacity-70">{argStr}</span>}
          </span>
        </div>
        {isDelegate && subagents && subagents.length > 0 && <SubagentPanel subagents={subagents} />}
      </motion.div>
    );
  }
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2 text-xs", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && <div className="mt-0.5 shrink-0"><HexMark size={22} /></div>}
      <div className={cn(
        "rounded-2xl px-3 py-2 max-w-[82%] whitespace-pre-wrap break-words leading-relaxed",
        isUser ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-br-sm"
          : "bg-muted/50 border border-muted rounded-bl-sm",
      )}>
        {m.content || <span className="opacity-60 italic">…</span>}
      </div>
    </motion.div>
  );
}

/** Live nested view of delegated sub-agents working in parallel. */
function SubagentPanel({ subagents }: { subagents: SubagentState[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const doneCount = subagents.filter((s) => s.status !== "running").length;
  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b bg-muted/30 text-[10px] font-medium text-muted-foreground">
        <Network className="h-3 w-3" />
        Sub-agents
        <span className="ml-auto tabular-nums">{doneCount}/{subagents.length} done</span>
      </div>
      <div className="divide-y divide-border/60">
        {subagents.map((s) => {
          const isOpen = expanded === s.id;
          const canOpen = s.status !== "running" && !!s.summary;
          return (
            <div key={s.id} className="px-2.5 py-1.5">
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className="w-full flex items-center gap-2 text-left disabled:cursor-default"
              >
                <span className="shrink-0">
                  {s.status === "running" ? <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                    : s.status === "done" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    : <XCircle className="h-3 w-3 text-red-500" />}
                </span>
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-background border text-muted-foreground">{s.role}</span>
                <span className="flex-1 min-w-0 truncate text-[11px]">{s.task}</span>
                {s.toolCount > 0 && (
                  <span className="shrink-0 text-[9px] font-mono text-muted-foreground/70 flex items-center gap-0.5">
                    <Wrench className="h-2.5 w-2.5" />{s.toolCount}
                  </span>
                )}
                {canOpen && <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />}
              </button>
              <AnimatePresence>
                {isOpen && s.summary && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-1.5 ml-5 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{s.summary}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
