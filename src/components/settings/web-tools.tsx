"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Web tools settings panel (Phase 4) — enable the agent's real-world reach
// (web_search / fetch_url / browse), pick a search provider, and test it live.
// Mounted on /settings.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  Globe, Search, Loader2, AlertCircle, ExternalLink, Monitor, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore, type WebSearchProvider } from "@/lib/store";
import { cn } from "@/lib/utils";

const PROVIDERS: Array<{ id: WebSearchProvider; name: string; keyless?: boolean; hint: string }> = [
  { id: "duckduckgo", name: "DuckDuckGo + Wiki", keyless: true, hint: "No key needed — default" },
  { id: "tavily", name: "Tavily", hint: "LLM-optimised search API (needs key)" },
  { id: "brave", name: "Brave", hint: "Brave Search API (needs key)" },
  { id: "searxng", name: "SearXNG", hint: "Self-hosted metasearch (needs URL)" },
];

interface SearchHit { title: string; url: string; snippet: string }

export function WebToolsPanel({ className }: { className?: string }) {
  const cfg = useSettingsStore((s) => s.webTools);
  const setWebTools = useSettingsStore((s) => s.setWebTools);

  const [testQuery, setTestQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<SearchHit[] | null>(null);

  async function runTest() {
    const q = testQuery.trim();
    if (!q) { toast.error("Enter a test query"); return; }
    setTesting(true);
    setResults(null);
    try {
      const res = await fetch("/api/agent-tools/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q, maxResults: 5, provider: cfg.searchProvider,
          tavilyKey: cfg.tavilyKey, braveKey: cfg.braveKey, searxngUrl: cfg.searxngUrl,
        }),
      });
      const json = await res.json();
      if (!json.ok) { toast.error(json.error ?? "Search failed"); setResults([]); return; }
      setResults(json.results ?? []);
      toast.success(`${json.results?.length ?? 0} results via ${json.provider}${json.degraded ? " (fallback)" : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" /> Web &amp; real-world tools
          {cfg.enabled
            ? <Badge variant="success" className="text-[10px] ml-1">on</Badge>
            : <Badge variant="secondary" className="text-[10px] ml-1">off</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Let the agent search the live web and read pages — <code className="bg-muted px-1 rounded">web_search</code> and{" "}
          <code className="bg-muted px-1 rounded">fetch_url</code>. Every call is approval-gated by default.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Master toggle */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
          <Switch checked={cfg.enabled} onCheckedChange={(v) => setWebTools({ enabled: v })} aria-label="Enable web tools" />
          <div className="flex-1">
            <p className="text-xs font-medium">Enable web tools</p>
            <p className="text-[11px] text-muted-foreground">Registers web_search + fetch_url for the /code agent</p>
          </div>
        </div>

        {cfg.enabled && (
          <>
            {/* Provider picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Search provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setWebTools({ searchProvider: p.id })}
                    title={p.hint}
                    className={cn(
                      "px-2.5 py-2 rounded-lg border text-left transition-colors",
                      cfg.searchProvider === p.id ? "bg-violet-500/10 border-violet-500/40" : "bg-card hover:bg-accent",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{p.name}</span>
                      {p.keyless && <Badge variant="success" className="text-[8px] px-1">keyless</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider-specific config */}
            {cfg.searchProvider === "tavily" && (
              <div className="space-y-1">
                <Label className="text-xs">Tavily API key</Label>
                <Input type="password" value={cfg.tavilyKey ?? ""} onChange={(e) => setWebTools({ tavilyKey: e.target.value })} placeholder="tvly-…" className="font-mono text-xs" />
              </div>
            )}
            {cfg.searchProvider === "brave" && (
              <div className="space-y-1">
                <Label className="text-xs">Brave Search API key</Label>
                <Input type="password" value={cfg.braveKey ?? ""} onChange={(e) => setWebTools({ braveKey: e.target.value })} placeholder="BSA…" className="font-mono text-xs" />
              </div>
            )}
            {cfg.searchProvider === "searxng" && (
              <div className="space-y-1">
                <Label className="text-xs">SearXNG instance URL</Label>
                <Input value={cfg.searxngUrl ?? ""} onChange={(e) => setWebTools({ searxngUrl: e.target.value })} placeholder="https://searx.example.com" className="font-mono text-xs" />
              </div>
            )}

            {/* Live test */}
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs font-semibold">Test search</Label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runTest(); } }}
                  placeholder="e.g. latest Claude model release"
                  className="pl-8 pr-20 text-sm"
                />
                <button
                  onClick={runTest}
                  disabled={testing || !testQuery.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Run
                </button>
              </div>
              {results && (
                <div className="rounded-lg border divide-y bg-card max-h-64 overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2.5">No results.</p>
                  ) : (
                    results.map((r, i) => (
                      <div key={i} className="px-3 py-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                          {r.title || r.url} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{r.url}</p>
                        {r.snippet && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.snippet}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Advanced browsing */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Switch checked={cfg.browseEnabled} onCheckedChange={(v) => setWebTools({ browseEnabled: v })} aria-label="Enable browsing" />
                <div className="flex-1">
                  <p className="text-xs font-medium inline-flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Advanced browsing (headless browser)</p>
                  <p className="text-[11px] text-muted-foreground">Registers <code className="bg-muted px-1 rounded">browse()</code> — needs an external Playwright service.</p>
                </div>
              </div>
              {cfg.browseEnabled && (
                <div className="space-y-1">
                  <Label className="text-xs">Browser service URL</Label>
                  <Input value={cfg.browseServiceUrl ?? ""} onChange={(e) => setWebTools({ browseServiceUrl: e.target.value })} placeholder="https://browser.your-server.com/browse" className="font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground">Leave blank to use the server&apos;s <code className="bg-muted px-1 rounded">BROWSER_SERVICE_URL</code>.</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
          <p>
            fetch_url blocks private/loopback addresses and cloud-metadata endpoints (SSRF-safe). Treat
            fetched page content as untrusted — the agent asks before each web call unless you switch it to Autonomous.
          </p>
        </div>
        {cfg.enabled && (
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>Keyed providers (Tavily/Brave) and the browser token are stored locally and sent only through this app&apos;s server proxy.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
