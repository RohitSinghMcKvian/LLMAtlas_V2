"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Memory panel (Phase 3) — manage the Atlas Brain's persistent, cross-session
// memory: browse/add/pin/delete memories, preview semantic recall live, and
// control auto-injection into the agent's system prompt. Used both on /settings
// and inside the /code agent rail's Memory overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain, Plus, Trash2, Pin, PinOff, Search, Sparkles, Loader2, Database, X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useMemoryStore, remember, recall,
  MEMORY_TYPES, MEMORY_TYPE_META,
  type MemoryType, type ScoredMemory,
} from "@/lib/brain/memory";
import { cn } from "@/lib/utils";

const TYPE_BADGE: Record<MemoryType, "default" | "secondary" | "success"> = {
  preference: "default",
  fact: "secondary",
  task: "secondary",
  skill: "success",
};

export function MemoryPanel({ className }: { className?: string }) {
  const memories = useMemoryStore((s) => s.memories);
  const autoInject = useMemoryStore((s) => s.autoInject);
  const injectK = useMemoryStore((s) => s.injectK);
  const backend = useMemoryStore((s) => s.backend);
  const setAutoInject = useMemoryStore((s) => s.setAutoInject);
  const setInjectK = useMemoryStore((s) => s.setInjectK);
  const togglePin = useMemoryStore((s) => s.togglePin);
  const remove = useMemoryStore((s) => s.remove);
  const clear = useMemoryStore((s) => s.clear);

  const [text, setText] = useState("");
  const [type, setType] = useState<MemoryType>("preference");
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScoredMemory[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live recall preview.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) { setResults(null); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        setResults(await recall(q, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, memories]);

  const grouped = useMemo(() => {
    const sorted = [...memories].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    const by: Record<MemoryType, typeof memories> = { preference: [], fact: [], task: [], skill: [] };
    for (const m of sorted) by[m.type].push(m);
    return by;
  }, [memories]);

  const highlightedIds = useMemo(() => new Set((results ?? []).map((r) => r.memory.id)), [results]);

  async function add() {
    const t = text.trim();
    if (!t) { toast.error("Write something to remember"); return; }
    setSaving(true);
    try {
      const { deduped } = await remember({ text: t, type });
      toast.success(deduped ? "Updated an existing memory" : "Memory saved");
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save memory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" /> Agent memory
          <Badge variant="secondary" className="text-[10px] ml-1">{memories.length}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The agent remembers your preferences, facts, past tasks, and reusable skills across sessions,
          and recalls the relevant ones automatically. Stored locally in your browser.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center gap-2.5">
            <Switch checked={autoInject} onCheckedChange={setAutoInject} aria-label="Auto-inject memories" />
            <div>
              <p className="text-xs font-medium">Auto-recall into prompts</p>
              <p className="text-[11px] text-muted-foreground">Inject relevant memories before each agent run</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground">Top-K</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={injectK}
              onChange={(e) => setInjectK(Number(e.target.value) || 5)}
              className="h-7 w-16 text-xs"
              disabled={!autoInject}
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[11px] text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>backend</span>
            <Badge variant="secondary" className="text-[10px] font-mono">{backend}</Badge>
          </div>
        </div>

        {/* Semantic search preview */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            {searching && <Loader2 className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try a semantic recall — e.g. “how do I like my React code?”"
              className="pl-8 text-sm"
            />
          </div>
          {results && (
            <div className="rounded-lg border divide-y bg-card">
              {results.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2.5">No relevant memories for that query.</p>
              ) : (
                results.map(({ memory, score }) => (
                  <div key={memory.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <Badge variant={TYPE_BADGE[memory.type]} className="text-[9px] shrink-0">{memory.type}</Badge>
                    <span className="flex-1 min-w-0 truncate">{memory.text}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{(score * 100).toFixed(0)}%</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Add memory */}
        <div className="space-y-2 rounded-lg border p-3">
          <Label className="text-xs font-semibold">Add a memory</Label>
          <div className="flex flex-wrap gap-1.5">
            {MEMORY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                title={MEMORY_TYPE_META[t].hint}
                className={cn(
                  "px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors",
                  type === t ? "bg-violet-500/15 border-violet-500/40 text-violet-300" : "bg-card hover:bg-accent text-muted-foreground",
                )}
              >
                {MEMORY_TYPE_META[t].label}
              </button>
            ))}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={MEMORY_TYPE_META[type].hint}
            className="text-sm min-h-[60px] resize-none"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void add(); } }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to save</span>
            <Button size="sm" onClick={add} disabled={saving || !text.trim()} className="h-7 gap-1.5 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Save memory
            </Button>
          </div>
        </div>

        {/* Memory list */}
        {memories.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-40" />
            <p>No memories yet. Add one above, or just work with the agent — it learns as you go.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {MEMORY_TYPES.filter((t) => grouped[t].length > 0).map((t) => (
              <div key={t}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{MEMORY_TYPE_META[t].label}</span>
                  <Badge variant="secondary" className="text-[9px]">{grouped[t].length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {grouped[t].map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-lg border bg-card",
                        highlightedIds.has(m.id) && "ring-1 ring-violet-500/40 border-violet-500/30",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs break-words">{m.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {m.pinned && <span className="inline-flex items-center gap-0.5 text-amber-500"><Pin className="h-2.5 w-2.5" /> pinned</span>}
                          {m.useCount > 0 && <span>recalled {m.useCount}×</span>}
                          <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePin(m.id)}
                        title={m.pinned ? "Unpin" : "Pin (boosts recall)"}
                        className="text-muted-foreground hover:text-amber-500 p-1 rounded hover:bg-accent shrink-0"
                      >
                        {m.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => { remove(m.id); toast.success("Memory removed"); }}
                        title="Delete memory"
                        className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-accent shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {memories.length > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                if (window.confirm(`Delete all ${memories.length} memories? This cannot be undone.`)) {
                  clear();
                  toast.success("All memories cleared");
                }
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Clear all memories
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Full-screen overlay wrapper used by the /code agent rail. */
export function MemoryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="border-b px-4 py-2.5 flex items-center gap-2 shrink-0">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Brain className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="font-semibold text-sm">Agent memory</div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">persistent · cross-session · local</span>
        <button onClick={onClose} className="ml-auto p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          <MemoryPanel />
        </div>
      </div>
    </div>
  );
}
