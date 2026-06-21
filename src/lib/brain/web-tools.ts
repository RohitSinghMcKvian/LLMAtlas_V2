"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — web tools loader (Phase 4: real-world use)
//
// Registers the agent's outward-reaching tools into the dynamic registry under
// the `web` namespace, driven by the user's Web-tools settings:
//   • web_search(query)      — search the web (DuckDuckGo keyless by default)
//   • fetch_url(url)         — fetch + read a page as text (SSRF-guarded server-side)
//   • browse(url, actions?)  — headless browser (only when advanced browsing is on)
//
// All are marked mutating → approval-gated by default (smart + manual modes),
// because reaching the external world widens the attack surface and a fetched
// page could carry injected instructions. The user opts into auto-run via
// Autonomous mode. Keys/service URLs travel only to our own API routes.
// ─────────────────────────────────────────────────────────────────────────────

import type { WebToolsConfig } from "@/lib/store";
import { useToolRegistry, type DynamicTool, type ToolResult } from "@/lib/brain/registry";

export const WEB_NAMESPACE = "web";

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as Record<string, unknown>;
}

function webSearchTool(cfg: WebToolsConfig): DynamicTool {
  return {
    namespace: WEB_NAMESPACE,
    mutating: true,
    definition: {
      name: "web_search",
      description:
        "Search the live web for up-to-date information and return a ranked list of {title, url, snippet}. Use for anything outside the workspace or beyond your training cutoff; follow up with fetch_url to read a result.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          maxResults: { type: "number", description: "Max results (default 6, max 10)." },
        },
        required: ["query"],
      },
    },
    execute: async (args): Promise<ToolResult> => {
      const query = String(args.query ?? "").trim();
      if (!query) return { ok: false, error: "query is required" };
      try {
        const json = await postJson("/api/agent-tools/web-search", {
          query,
          maxResults: typeof args.maxResults === "number" ? args.maxResults : undefined,
          provider: cfg.searchProvider,
          tavilyKey: cfg.tavilyKey,
          braveKey: cfg.braveKey,
          searxngUrl: cfg.searxngUrl,
        });
        if (!json.ok) return { ok: false, error: String(json.error ?? "web search failed") };
        return { ok: true, output: json.results };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "web search failed" };
      }
    },
  };
}

function fetchUrlTool(): DynamicTool {
  return {
    namespace: WEB_NAMESPACE,
    mutating: true,
    definition: {
      name: "fetch_url",
      description:
        "Fetch a web page or API URL and return its readable text content (HTML is stripped to text; JSON is returned raw). Internal/private addresses are blocked. Use after web_search to read a specific result.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "Absolute http(s) URL." } },
        required: ["url"],
      },
    },
    execute: async (args): Promise<ToolResult> => {
      const url = String(args.url ?? "").trim();
      if (!url) return { ok: false, error: "url is required" };
      try {
        const json = await postJson("/api/agent-tools/fetch", { url });
        if (!json.ok) return { ok: false, error: String(json.error ?? "fetch failed") };
        return {
          ok: true,
          output: { url: json.url, title: json.title, contentType: json.contentType, truncated: json.truncated, text: json.text },
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
      }
    },
  };
}

function browseTool(cfg: WebToolsConfig): DynamicTool {
  return {
    namespace: WEB_NAMESPACE,
    mutating: true,
    definition: {
      name: "browse",
      description:
        "Open a URL in a real headless browser and return the rendered page text (and optionally a screenshot). Use only for JavaScript-heavy pages that fetch_url can't read. Slower than fetch_url.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Absolute http(s) URL." },
          actions: { type: "array", description: "Optional interaction steps (click/type/scroll) for the browser service.", items: { type: "object" } },
        },
        required: ["url"],
      },
    },
    execute: async (args): Promise<ToolResult> => {
      const url = String(args.url ?? "").trim();
      if (!url) return { ok: false, error: "url is required" };
      try {
        const json = await postJson("/api/agent-tools/browse", {
          url,
          actions: args.actions,
          serviceUrl: cfg.browseServiceUrl,
        });
        if (!json.ok) return { ok: false, error: String(json.error ?? "browse failed") };
        return { ok: true, output: { url: json.finalUrl ?? url, title: json.title, text: json.text } };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "browse failed" };
      }
    },
  };
}

/** Register or clear the web tools to match the current settings. */
export function syncWebTools(cfg: WebToolsConfig): void {
  const reg = useToolRegistry.getState();
  if (!cfg.enabled) {
    reg.clearNamespace(WEB_NAMESPACE);
    return;
  }
  const tools: DynamicTool[] = [webSearchTool(cfg), fetchUrlTool()];
  if (cfg.browseEnabled) tools.push(browseTool(cfg));
  reg.registerNamespace(WEB_NAMESPACE, tools);
}
