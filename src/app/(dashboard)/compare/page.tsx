"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  BarChart3, Send, Plus, X, Download, Loader2, Search,
  Sparkles, RotateCcw, Globe, Trophy, Menu, PanelLeft, Scale, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ModelPicker } from "@/components/playground/model-picker";
import { FollowUpSuggestions } from "@/components/playground/follow-up-suggestions";
import { SourcesStrip } from "@/components/compare/sources-strip";
import { AnswerCell } from "@/components/compare/answer-cell";
import { CompareHistorySidebar } from "@/components/compare/history-sidebar";
import { CellExpandModal } from "@/components/compare/cell-expand-modal";
import { SummaryModal } from "@/components/compare/summary-modal";
import { findModel, MODELS } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";
import { useCompareStore } from "@/lib/compare-store";
import { usePendingCompare } from "@/lib/brain/atlas-agent-store";
import { estimateTokens, cn, formatLatency } from "@/lib/utils";
import { parseStreamBuffer, type StreamEvent } from "@/lib/stream-events";
import {
  type Round, EMPTY_CELL, FOCUS_MODES, focusById, buildThread,
  serializeRounds, hydrateRounds,
} from "@/lib/compare";
import { UltraModeToggle } from "@/components/shared/ultra-mode-toggle";
import { autoPickCapability, type CapabilityId, type UltraMode } from "@/lib/ucl";

const MAX_COLUMNS = 4;
const MIN_COLUMNS = 2;

const SAMPLE_PROMPTS = [
  "Explain why the sky is blue, in plain English, in under 80 words.",
  "Write a recursive binary search in Python with type hints.",
  "What are the key differences between RAG and fine-tuning? When would you use each?",
  "What happened in AI this past week? Summarize the biggest releases.",
  "Compare the trade-offs of REST vs GraphQL for a new mobile app backend.",
];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function pickNewModel(existing: string[]): string {
  const free = MODELS.find((m) => m.free && !existing.includes(m.id));
  return (free ?? MODELS.find((m) => !existing.includes(m.id)) ?? MODELS[0]).id;
}

export default function ComparePage() {
  const byok = useSettingsStore((s) => s.keys);
  const webTools = useSettingsStore((s) => s.webTools);

  // ── Session persistence ───────────────────────────────────────────────────
  const store = useCompareStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  const [columns, setColumns] = useState<string[]>([
    "groq-llama-3.3-70b", "or-deepseek-v3-free", "google-gemini-2.5-flash",
  ]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [input, setInput] = useState("");
  const [focusId, setFocusId] = useState("web");
  const [ultraMode, setUltraMode] = useState<UltraMode>("plus");
  const [capabilities, setCapabilities] = useState<CapabilityId[]>([]);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [expand, setExpand] = useState<{ roundId: string; col: number } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const sessionIdRef = useRef<string | null>(store.currentId);
  const roundsRef = useRef<Round[]>(rounds);
  useEffect(() => { roundsRef.current = rounds; }, [rounds]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Restore or start fresh ────────────────────────────────────────────────
  const loadSession = useCallback((id: string) => {
    const s = storeRef.current;
    const session = s.sessions.find((c) => c.id === id);
    if (!session) return;
    s.setCurrent(id);
    sessionIdRef.current = id;
    setColumns(session.columns);
    setFocusId(session.focusId);
    setRounds(hydrateRounds(session.rounds));
  }, []);

  const newSession = useCallback(() => {
    const defaultCols = ["groq-llama-3.3-70b", "or-deepseek-v3-free", "google-gemini-2.5-flash"];
    setColumns(defaultCols);
    setFocusId("web");
    setRounds([]);
    roundsRef.current = [];
    sessionIdRef.current = null;
    storeRef.current.setCurrent(null);
    setInput("");
    toast.success("New comparison");
  }, []);

  // Consume agent-pushed compare
  const consumePendingCompare = usePendingCompare((s) => s.consume);
  useEffect(() => {
    const pending = consumePendingCompare();
    if (pending) {
      const ids = pending.models.filter((id) => findModel(id)).slice(0, MAX_COLUMNS);
      if (ids.length >= MIN_COLUMNS) setColumns(ids);
      if (pending.prompt) setInput(pending.prompt);
      return;
    }
    // Restore last session if one was active
    if (store.currentId) loadSession(store.currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save to store when rounds or columns change
  useEffect(() => {
    if (!sessionIdRef.current || rounds.length === 0) return;
    storeRef.current.updateSession(sessionIdRef.current, {
      columns,
      focusId,
      rounds: serializeRounds(rounds),
    });
  }, [rounds, columns, focusId]);

  // Auto-title from first prompt
  const autoTitled = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sessionIdRef.current) return;
    const id = sessionIdRef.current;
    if (autoTitled.current.has(id)) return;
    const first = rounds[0];
    if (first?.prompt) {
      autoTitled.current.add(id);
      storeRef.current.renameSession(id, first.prompt.slice(0, 50) || "New comparison");
    }
  }, [rounds]);

  const busy = useMemo(
    () => searchingId !== null || rounds.some((r) => Object.values(r.responses).some((c) => c.streaming)),
    [rounds, searchingId],
  );

  const winCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    rounds.forEach((r) => { if (r.winner !== undefined) counts[r.winner] = (counts[r.winner] ?? 0) + 1; });
    return counts;
  }, [rounds]);

  const patchCell = useCallback((roundId: string, col: number, patch: Partial<Round["responses"][number]>) => {
    setRounds((prev) => prev.map((r) => {
      if (r.id !== roundId) return r;
      const cur = r.responses[col] ?? EMPTY_CELL;
      return { ...r, responses: { ...r.responses, [col]: { ...cur, ...patch } } };
    }));
  }, []);

  // ── Web search ─────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (query: string) => {
    try {
      const res = await fetch("/api/agent-tools/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query, maxResults: 6,
          provider: webTools.searchProvider,
          tavilyKey: webTools.tavilyKey,
          braveKey: webTools.braveKey,
          searxngUrl: webTools.searxngUrl,
        }),
      });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.results)) return json.results;
    } catch { /* no sources */ }
    return [];
  }, [webTools]);

  // ── Stream one cell ──────────────────────────────────────────────────────
  const streamCell = useCallback(async (roundId: string, col: number) => {
    const idx = roundsRef.current.findIndex((r) => r.id === roundId);
    if (idx < 0) return;
    const modelId = columns[col];
    const model = findModel(modelId);
    if (!model) return;
    const focus = focusById(focusId);
    const messages = buildThread(roundsRef.current, col, idx, focus.system);

    patchCell(roundId, col, { ...EMPTY_CELL, streaming: true });
    const start = Date.now();
    let firstChunk = 0;

    const userPrompt = roundsRef.current[idx]?.prompt ?? "";
    const effectiveCapabilities = (() => {
      if (capabilities.length) return capabilities;
      const auto = autoPickCapability(userPrompt);
      return auto ? [auto.id] : [];
    })();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          messages,
          apiKey: byok[model.provider],
          maxTokens: 4096,
          // Ask the model to use rich Markdown (tables, KaTeX math, code fences,
          // mermaid/svg diagrams, GFM) so the comparison cells render properly.
          artifactMode: true,
          ultra: { mode: ultraMode, capabilities: effectiveCapabilities },
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", cleanText = "";
      let errorEv: StreamEvent | undefined, fallbackEv: StreamEvent | undefined;
      let frame = 0;
      const flush = () => { frame = 0; patchCell(roundId, col, { content: cleanText, ttftMs: firstChunk, errorEvent: errorEv, fallback: fallbackEv }); };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parsed = parseStreamBuffer(buf);
        const prevLen = cleanText.length;
        cleanText = parsed.text;
        for (const ev of parsed.events) {
          if (ev.kind === "error") errorEv = ev;
          else if (ev.kind === "fallback") fallbackEv = ev;
        }
        if (!firstChunk && cleanText.length > prevLen) firstChunk = Date.now() - start;
        if (!frame) frame = requestAnimationFrame(flush);
      }
      if (frame) cancelAnimationFrame(frame);
      flush();
      const elapsed = Date.now() - start;
      const toks = estimateTokens(cleanText);
      patchCell(roundId, col, {
        streaming: false, latencyMs: elapsed, tokens: toks,
        tokensPerSec: toks > 0 ? Math.round(toks / (elapsed / 1000)) : undefined,
        errorEvent: errorEv, fallback: fallbackEv,
      });
    } catch (err) {
      // Swallow benign aborts (navigation, new-session, retry) — see playground/page.tsx
      const e = err as Error & { code?: string };
      const isAbort =
        e.name === "AbortError" || e.name === "Canceled" || e.name === "CanceledError" ||
        e.code === "ERR_CANCELED" || e.code === "ABORT_ERR" ||
        /aborted|cancel/i.test(e.message ?? "");
      if (isAbort) return;
      const msg = err instanceof Error ? err.message : "request failed";
      patchCell(roundId, col, { ...EMPTY_CELL, error: msg, errorEvent: { kind: "error", code: "stream_aborted", message: msg } });
    }
  }, [columns, focusId, byok, patchCell, ultraMode, capabilities]);

  // ── Send a turn ──────────────────────────────────────────────────────────
  const send = useCallback(async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    const focus = focusById(focusId);
    setInput("");

    // Ensure a persistent session exists
    if (!sessionIdRef.current) {
      const s = storeRef.current.createSession({ columns, focusId, title: text.slice(0, 50) || "New comparison" });
      sessionIdRef.current = s.id;
      autoTitled.current.add(s.id);
    }

    const id = newId();
    const round: Round = { id, prompt: text, responses: {} };
    columns.forEach((_, c) => { round.responses[c] = { ...EMPTY_CELL, streaming: true }; });
    const next = [...roundsRef.current, round];
    roundsRef.current = next;
    setRounds(next);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));

    if (focus.web) {
      setSearchingId(id);
      const sources = await runSearch(text);
      roundsRef.current = roundsRef.current.map((r) => (r.id === id ? { ...r, sources } : r));
      setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, sources } : r)));
      setSearchingId(null);
    }

    await Promise.all(columns.map((_, c) => streamCell(id, c)));
  }, [input, busy, focusId, columns, runSearch, streamCell]);

  // ── Column management ───────────────────────────────────────────────────
  const changeColumn = useCallback((col: number, id: string) => {
    setColumns((prev) => prev.map((c, i) => (i === col ? id : c)));
    setRounds((prev) => prev.map((r) => {
      const responses = { ...r.responses };
      delete responses[col];
      return { ...r, responses, winner: r.winner === col ? undefined : r.winner };
    }));
  }, []);

  const addColumn = useCallback(() => {
    setColumns((prev) => (prev.length >= MAX_COLUMNS ? prev : [...prev, pickNewModel(prev)]));
  }, []);

  const removeColumn = useCallback((col: number) => {
    setColumns((prev) => (prev.length <= MIN_COLUMNS ? prev : prev.filter((_, i) => i !== col)));
    setRounds((prev) => prev.map((r) => {
      const responses: Round["responses"] = {};
      Object.entries(r.responses).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki === col) return;
        responses[ki > col ? ki - 1 : ki] = v;
      });
      let winner = r.winner;
      if (winner === col) winner = undefined;
      else if (winner !== undefined && winner > col) winner -= 1;
      return { ...r, responses, winner };
    }));
  }, []);

  const vote = useCallback((roundId: string, col: number) => {
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, winner: r.winner === col ? undefined : col } : r)));
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────
  const exportConversation = useCallback(() => {
    const lines: string[] = ["# Model Comparison\n"];
    rounds.forEach((r, ri) => {
      lines.push(`## Turn ${ri + 1}`, `**Prompt:** ${r.prompt}\n`);
      if (r.sources?.length) {
        lines.push("**Sources:**");
        r.sources.forEach((s, i) => lines.push(`${i + 1}. [${s.title}](${s.url})`));
        lines.push("");
      }
      columns.forEach((mid, c) => {
        const m = findModel(mid);
        const cell = r.responses[c];
        lines.push(`### ${m?.name ?? mid}${r.winner === c ? " 🏆" : ""}`);
        if (cell?.latencyMs) lines.push(`*TTFT: ${cell.ttftMs ? formatLatency(cell.ttftMs) : "—"} · Total: ${formatLatency(cell.latencyMs)} · ~${cell.tokens} tok · ${cell.tokensPerSec} tok/s*`);
        lines.push(cell?.content || "_No response_", "");
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `compare-${Date.now()}.md`;
    a.click();
    toast.success("Exported");
  }, [rounds, columns]);

  const focus = focusById(focusId);
  const lastRound = rounds[rounds.length - 1];
  const lastComplete = lastRound && !busy && Object.values(lastRound.responses).some((c) => c.content);

  // ── Responsive column count: cap at 2 on mobile for readable cards ────────
  const visibleCols = columns;

  return (
    <div className="flex h-full min-h-0">
      {/* Desktop sidebar */}
      <CompareHistorySidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={loadSession}
        onNew={newSession}
        currentId={sessionIdRef.current}
      />

      {/* Mobile sidebar via sheet */}
      <Sheet open={mobileDrawer} onOpenChange={setMobileDrawer}>
        <SheetContent side="left" className="w-72 p-0 [&>button:last-child]:hidden">
          <SheetTitle className="sr-only">Comparison history</SheetTitle>
          <CompareHistorySidebar
            collapsed={false}
            onToggleCollapsed={() => {}}
            onSelect={loadSession}
            onNew={() => { newSession(); setMobileDrawer(false); }}
            currentId={sessionIdRef.current}
            mobile
            onClose={() => setMobileDrawer(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileDrawer(true)}
              className="rounded p-1.5 hover:bg-accent md:hidden"
              title="History"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded p-1.5 hover:bg-accent md:inline-flex"
              title={sidebarCollapsed ? "Show history" : "Hide history"}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                <h1 className="truncate text-sm font-bold sm:text-base">Comparison Lab</h1>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <UltraModeToggle
                mode={ultraMode}
                capabilities={capabilities}
                onModeChange={setUltraMode}
                onCapabilitiesChange={setCapabilities}
                allowedModes={["standard", "plus", "ultra"]}
                expanded={false}
                className="mr-1"
              />
              {rounds.length > 0 && (
                <>
                  {/* Summary — the headline feature, icon-only on mobile, full label on sm+ */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSummaryOpen(true)}
                    disabled={busy}
                    className="h-7 gap-1 bg-gradient-to-br from-violet-500 to-sky-500 px-2 text-xs text-white hover:opacity-90"
                    title="AI summary: compare and pick a winner"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Summary</span>
                  </Button>
                  {/* Desktop: Export + New shown inline */}
                  <Button variant="ghost" size="sm" onClick={exportConversation} className="hidden h-7 gap-1 px-2 text-xs sm:inline-flex">
                    <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={newSession} className="hidden h-7 gap-1 px-2 text-xs sm:inline-flex">
                    <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New</span>
                  </Button>
                  {/* Mobile: collapse Export + New into a More overflow menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent sm:hidden"
                        aria-label="More actions"
                        title="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={exportConversation}>
                        <Download className="h-3.5 w-3.5" /> Export
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={newSession}>
                        <RotateCcw className="h-3.5 w-3.5" /> New session
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Model columns bar — horizontal scroll on mobile */}
        <div className="sticky top-0 z-20 overflow-x-auto border-b bg-background/95 px-3 py-2 backdrop-blur sm:px-5">
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {visibleCols.map((id, col) => (
              <div key={col} className="flex items-center gap-1 min-w-[160px] sm:min-w-[200px] max-w-[280px] flex-1">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {col + 1}
                </span>
                <ModelPicker value={id} onChange={(v) => changeColumn(col, v)} className="flex-1" />
                {winCounts[col] ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400" title={`${winCounts[col]} win(s)`}>
                    <Trophy className="h-2.5 w-2.5" />{winCounts[col]}
                  </span>
                ) : null}
                {columns.length > MIN_COLUMNS && (
                  <button onClick={() => removeColumn(col)} className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Remove model">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {columns.length < MAX_COLUMNS && (
              <button
                onClick={addColumn}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-dashed px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
        </div>

        {/* Conversation timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5">
          {rounds.length === 0 ? (
            <EmptyState onPick={(p) => setInput(p)} />
          ) : (
            <div className="mx-auto max-w-[1600px] space-y-6">
              {rounds.map((round) => (
                <div key={round.id}>
                  {/* User prompt bubble */}
                  <div className="mb-3 flex justify-center">
                    <div className="inline-flex max-w-[min(90%,40rem)] items-start gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium sm:px-4 sm:py-2.5 dark:bg-primary/15">
                      <span className="mt-0.5 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">You</span>
                      <span className="min-w-0 whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{round.prompt}</span>
                    </div>
                  </div>

                  {/* Searching indicator */}
                  {searchingId === round.id && (
                    <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Search className="h-3.5 w-3.5 animate-pulse text-sky-500" /> Searching the web…
                    </div>
                  )}

                  {/* Sources */}
                  {round.sources?.length ? <SourcesStrip sources={round.sources} /> : null}

                  {/* Answers — responsive grid: 1 col on mobile, 2 on sm, all on lg */}
                  <div className={cn(
                    "grid gap-3 [&>*]:min-w-0",
                    visibleCols.length === 2
                      ? "grid-cols-1 sm:grid-cols-2"
                      : visibleCols.length === 3
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
                  )}>
                    {visibleCols.map((mid, col) => (
                      <AnswerCell
                        key={col}
                        modelId={mid}
                        state={round.responses[col] ?? EMPTY_CELL}
                        sources={round.sources}
                        isWinner={round.winner === col}
                        canVote={!busy && !!round.responses[col]?.content}
                        winCount={winCounts[col] ?? 0}
                        onVote={() => vote(round.id, col)}
                        onRegenerate={() => streamCell(round.id, col)}
                        onExpand={() => setExpand({ roundId: round.id, col })}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Follow-up suggestions */}
              {lastComplete && lastRound && (
                <div className="rounded-xl border bg-card/50">
                  <FollowUpSuggestions
                    lastUserMessage={lastRound.prompt}
                    lastAssistantMessage={lastRound.responses[0]?.content ?? ""}
                    modelId={columns[0]}
                    apiKey={byok[findModel(columns[0])?.provider ?? "groq"]}
                    onSelect={(p) => send(p)}
                    disabled={busy}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-background/95 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3">
          <div className="mx-auto max-w-[1600px]">
            {/* Focus modes — scrollable row on mobile */}
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {FOCUS_MODES.map((f) => {
                const Icon = f.icon;
                const active = f.id === focusId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFocusId(f.id)}
                    title={f.hint}
                    className={cn(
                      "inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors sm:gap-1.5 sm:text-xs",
                      active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {f.label}
                  </button>
                );
              })}
              {focus.web && (
                <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                  <Globe className="h-3 w-3 text-sky-500" />
                  <span className="hidden xs:inline">{webTools.searchProvider}</span>
                </span>
              )}
            </div>

            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={rounds.length ? "Follow up — every model keeps its own thread…" : "Ask anything — runs on all models at once."}
                className="max-h-32 min-h-[44px] flex-1 resize-none text-sm sm:min-h-[52px]"
              />
              <Button onClick={() => send()} disabled={busy || !input.trim()} size="lg" className="h-[44px] gap-1.5 px-4 sm:h-[52px] sm:px-5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">{busy ? "Running" : "Send"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {expand && (() => {
        const round = rounds.find((r) => r.id === expand.roundId);
        if (!round) return null;
        return (
          <CellExpandModal
            open
            onClose={() => setExpand(null)}
            modelId={columns[expand.col]}
            state={round.responses[expand.col] ?? EMPTY_CELL}
            sources={round.sources}
            prompt={round.prompt}
          />
        );
      })()}
      <SummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        rounds={rounds}
        columns={columns}
        winCounts={winCounts}
      />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-2 py-8 text-center sm:py-10">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-sky-500/20 sm:h-14 sm:w-14">
        <Sparkles className="h-6 w-6 text-violet-500 sm:h-7 sm:w-7" />
      </div>
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Ask once. Compare every model.</h2>
      <p className="mt-2 max-w-md text-xs text-muted-foreground sm:text-sm">
        A multi-turn arena: every model keeps its own conversation thread. Turn on{" "}
        <span className="font-medium text-foreground">Web</span> focus to ground answers in live sources with
        inline citations.
      </p>
      <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
        {SAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-xl border bg-card px-3 py-2.5 text-left text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:shadow-sm sm:px-4 sm:py-3 sm:text-sm"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
