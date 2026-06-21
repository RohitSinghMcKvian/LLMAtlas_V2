// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — web_search tool route (Phase 4: real-world use)
//
// The agent loop runs client-side and is sandboxed (no outbound HTTP). This
// stateless route gives it a `web_search` capability without breaking that
// model: the browser calls our own origin, and the search provider is reached
// server-side (keys never touch the client).
//
// Providers (chosen per request; falls back to the keyless provider on failure):
//   • duckduckgo — KEYLESS DEFAULT: DuckDuckGo Instant-Answer JSON + Wikipedia
//                  search, merged. (DDG's HTML endpoint bot-blocks server IPs,
//                  but its IA JSON API and the Wikipedia API answer reliably.)
//   • tavily     — api.tavily.com/search        (tavilyKey | TAVILY_API_KEY)
//   • brave      — Brave Search API             (braveKey  | BRAVE_API_KEY)
//   • searxng    — self-hosted SearXNG JSON API (searxngUrl | SEARXNG_URL)
//
// All providers are normalised to { title, url, snippet }[].
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 15_000;
const UA =
  "Mozilla/5.0 (compatible; LLMAtlasBot/0.1; +https://llmatlas.is-a.dev)";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

type Provider = "duckduckgo" | "tavily" | "brave" | "searxng";

interface Body {
  query?: string;
  maxResults?: number;
  provider?: Provider;
  tavilyKey?: string;
  braveKey?: string;
  searxngUrl?: string;
}

function timeoutSignal(): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), TIMEOUT_MS);
  return c.signal;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

// ── Keyless: DuckDuckGo Instant Answer + Wikipedia ───────────────────────────
async function searchKeyless(query: string, max: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const push = (r: SearchResult) => {
    if (r.url && /^https?:\/\//.test(r.url) && !seen.has(r.url)) { seen.add(r.url); results.push(r); }
  };

  const [ddg, wiki] = await Promise.allSettled([
    fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { "User-Agent": UA }, signal: timeoutSignal(),
    }).then((r) => r.json() as Promise<Record<string, unknown>>),
    fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${max}`, {
      headers: { "User-Agent": UA }, signal: timeoutSignal(),
    }).then((r) => r.json() as Promise<Record<string, unknown>>),
  ]);

  // DuckDuckGo Instant Answer — the abstract usually links a real source page.
  if (ddg.status === "fulfilled" && ddg.value) {
    const j = ddg.value as { AbstractText?: string; AbstractURL?: string; Heading?: string; RelatedTopics?: Array<{ FirstURL?: string; Text?: string; Topics?: unknown }> };
    if (j.AbstractText && j.AbstractURL) {
      push({ title: j.Heading || query, url: j.AbstractURL, snippet: j.AbstractText });
    }
    for (const t of j.RelatedTopics ?? []) {
      if (t.Topics || !t.FirstURL || !t.Text) continue; // skip nested groups
      // Skip DDG's own category links (not readable source pages).
      if (/^https?:\/\/duckduckgo\.com\//.test(t.FirstURL)) continue;
      push({ title: t.Text.split(" - ")[0].slice(0, 100), url: t.FirstURL, snippet: t.Text });
    }
  }

  // Wikipedia full-text search — reliable, keyless web results.
  if (wiki.status === "fulfilled" && wiki.value) {
    const hits = (wiki.value as { query?: { search?: Array<{ title: string; snippet?: string }> } }).query?.search ?? [];
    for (const s of hits) {
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`;
      push({ title: s.title, url, snippet: stripTags(s.snippet ?? "") });
    }
  }

  return results.slice(0, max);
}

// ── Tavily ───────────────────────────────────────────────────────────────────
async function searchTavily(query: string, max: number, key: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, max_results: max, search_depth: "basic" }),
    signal: timeoutSignal(),
  });
  if (!res.ok) throw new Error(`tavily HTTP ${res.status}`);
  const json = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
  return (json.results ?? []).slice(0, max).map((r) => ({ title: r.title, url: r.url, snippet: r.content ?? "" }));
}

// ── Brave ────────────────────────────────────────────────────────────────────
async function searchBrave(query: string, max: number, key: string): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${max}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: timeoutSignal(),
  });
  if (!res.ok) throw new Error(`brave HTTP ${res.status}`);
  const json = (await res.json()) as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
  return (json.web?.results ?? []).slice(0, max).map((r) => ({ title: r.title, url: r.url, snippet: stripTags(r.description ?? "") }));
}

// ── SearXNG ──────────────────────────────────────────────────────────────────
async function searchSearxng(query: string, max: number, base: string): Promise<SearchResult[]> {
  const url = `${base.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA }, signal: timeoutSignal() });
  if (!res.ok) throw new Error(`searxng HTTP ${res.status}`);
  const json = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
  return (json.results ?? []).slice(0, max).map((r) => ({ title: r.title, url: r.url, snippet: r.content ?? "" }));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
  const max = Math.max(1, Math.min(10, body.maxResults ?? 6));
  const provider: Provider = body.provider ?? "duckduckgo";

  const tavilyKey = body.tavilyKey || process.env.TAVILY_API_KEY;
  const braveKey = body.braveKey || process.env.BRAVE_API_KEY;
  const searxngUrl = body.searxngUrl || process.env.SEARXNG_URL;

  const run = async (p: Provider): Promise<SearchResult[]> => {
    switch (p) {
      case "tavily":
        if (!tavilyKey) throw new Error("Tavily selected but no API key configured");
        return searchTavily(query, max, tavilyKey);
      case "brave":
        if (!braveKey) throw new Error("Brave selected but no API key configured");
        return searchBrave(query, max, braveKey);
      case "searxng":
        if (!searxngUrl) throw new Error("SearXNG selected but no instance URL configured");
        return searchSearxng(query, max, searxngUrl);
      default:
        return searchKeyless(query, max);
    }
  };

  try {
    let results = await run(provider);
    let used = provider;
    // Fall back to the keyless provider if a keyed provider returned nothing.
    if (results.length === 0 && provider !== "duckduckgo") {
      results = await searchKeyless(query, max);
      used = "duckduckgo";
    }
    return NextResponse.json({ ok: true, provider: used, query, results });
  } catch (e) {
    // Last-ditch keyless fallback so the agent still gets *something*.
    if (provider !== "duckduckgo") {
      try {
        const results = await searchKeyless(query, max);
        return NextResponse.json({ ok: true, provider: "duckduckgo", query, results, degraded: e instanceof Error ? e.message : "primary provider failed" });
      } catch { /* fall through */ }
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "web search failed" },
      { status: 502 },
    );
  }
}
