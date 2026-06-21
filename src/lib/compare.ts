// ─────────────────────────────────────────────────────────────────────────────
// Compare engine — shared types & helpers for the Perplexity-style, multi-turn
// model comparison arena. Keeps the page component thin: thread reconstruction,
// web-search context injection, citation linkifying and focus modes live here.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChatMessage } from "@/lib/providers";
import type { StreamEvent } from "@/lib/stream-events";
import { Globe, GraduationCap, MessageSquare, PenLine, type LucideIcon } from "lucide-react";

/** A single web result attached to a round (Perplexity-style source card). */
export interface Source {
  title: string;
  url: string;
  snippet: string;
}

/** Per-model response state for one round (one cell in the comparison grid). */
export interface CellState {
  content: string;
  streaming: boolean;
  latencyMs?: number;
  ttftMs?: number;
  tokens?: number;
  tokensPerSec?: number;
  error?: string;
  errorEvent?: StreamEvent;
  fallback?: StreamEvent;
}

export const EMPTY_CELL: CellState = { content: "", streaming: false };

/** One conversational turn: a shared user prompt + each model's answer. */
export interface Round {
  id: string;
  prompt: string;
  /** Web results that were injected as context for this round (if any). */
  sources?: Source[];
  /** colIndex -> model response */
  responses: Record<number, CellState>;
  /** Column index the user voted as the best answer this round. */
  winner?: number;
}

// ── Focus modes (mirrors Perplexity's Focus selector) ────────────────────────
export interface FocusMode {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Whether this focus runs a live web search before answering. */
  web: boolean;
  /** Base system prompt shaping the answer style. */
  system: string;
  hint: string;
}

export const FOCUS_MODES: FocusMode[] = [
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    web: false,
    system:
      "You are a helpful, knowledgeable assistant. Answer clearly and directly, using Markdown where it improves readability.",
    hint: "Pure model knowledge — no web search.",
  },
  {
    id: "web",
    label: "Web",
    icon: Globe,
    web: true,
    system:
      "You are a research assistant with access to live web search results. Ground your answer in the provided sources and cite them inline using bracketed numbers like [1], [2]. If the sources do not cover something, say so.",
    hint: "Searches the web and cites live sources.",
  },
  {
    id: "academic",
    label: "Academic",
    icon: GraduationCap,
    web: true,
    system:
      "You are a rigorous academic research assistant. Use the provided web sources, cite them inline as [1], [2], prefer authoritative references, and explicitly flag uncertainty or conflicting evidence.",
    hint: "Rigorous, citation-first answers.",
  },
  {
    id: "writing",
    label: "Writing",
    icon: PenLine,
    web: false,
    system:
      "You are a creative and precise writing assistant. Produce polished, well-structured prose. Match the tone the user asks for and avoid filler.",
    hint: "Creative prose — no web search.",
  },
];

export function focusById(id: string): FocusMode {
  return FOCUS_MODES.find((f) => f.id === id) ?? FOCUS_MODES[0];
}

/** Render a round's sources as a compact, numbered context block for the model. */
export function sourcesContext(sources?: Source[]): string {
  if (!sources?.length) return "";
  const lines = sources.map(
    (s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet.slice(0, 280)}`,
  );
  return `\n\nWeb search results (cite the relevant ones inline as [n]):\n${lines.join("\n\n")}`;
}

/**
 * Rebuild a single model's conversation thread up to (and including) `upto`.
 * The current round's user prompt is included; its assistant answer is omitted
 * because that's what we're about to generate. Prior rounds contribute both
 * sides so each model sees its own history — true multi-turn comparison.
 */
export function buildThread(
  rounds: Round[],
  col: number,
  upto: number,
  system: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (let i = 0; i <= upto; i++) {
    const r = rounds[i];
    if (!r) continue;
    messages.push({ role: "user", content: r.prompt + sourcesContext(r.sources) });
    if (i < upto) {
      const prior = r.responses[col];
      if (prior?.content) messages.push({ role: "assistant", content: prior.content });
    }
  }
  return messages;
}

/**
 * Turn inline `[n]` markers into clickable Markdown links to the matching
 * source, so citations render as tappable references (Perplexity-style).
 * Escapes the brackets so the visible text stays `[n]`.
 */
export function linkifyCitations(text: string, sources?: Source[]): string {
  if (!sources?.length) return text;
  return text.replace(/\[(\d{1,2})\]/g, (match, digits: string) => {
    const idx = parseInt(digits, 10) - 1;
    const url = sources[idx]?.url;
    return url ? `[\\[${digits}\\]](${url})` : match;
  });
}

// ── Persistable session shape (no streaming / non-serializable fields) ───────

/** A round stripped to only persistable data (content + metrics). */
export interface SavedRound {
  id: string;
  prompt: string;
  sources?: Source[];
  responses: Record<number, { content: string; latencyMs?: number; ttftMs?: number; tokens?: number; tokensPerSec?: number }>;
  winner?: number;
}

export interface CompareSession {
  id: string;
  title: string;
  columns: string[];
  focusId: string;
  rounds: SavedRound[];
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Convert live Round[] to serializable SavedRound[] (drops streaming state). */
export function serializeRounds(rounds: Round[]): SavedRound[] {
  return rounds.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    sources: r.sources,
    responses: Object.fromEntries(
      Object.entries(r.responses).map(([k, v]) => [
        k,
        { content: v.content, latencyMs: v.latencyMs, ttftMs: v.ttftMs, tokens: v.tokens, tokensPerSec: v.tokensPerSec },
      ]),
    ),
    winner: r.winner,
  }));
}

/** Hydrate SavedRound[] back to live Round[] (cells are non-streaming). */
export function hydrateRounds(saved: SavedRound[]): Round[] {
  return saved.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    sources: r.sources,
    responses: Object.fromEntries(
      Object.entries(r.responses).map(([k, v]) => [k, { ...EMPTY_CELL, ...v }]),
    ),
    winner: r.winner,
  }));
}

/** Short hostname label for a source chip, e.g. "en.wikipedia.org" -> "wikipedia". */
export function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    return parts.length > 2 ? parts[parts.length - 2] : parts[0];
  } catch {
    return "source";
  }
}
