// Light-weight reachability + latency checks for free providers.
// Used by the Status page and the topbar indicator.

import { PROVIDERS, type ProviderId } from "./models";

export interface StatusResult {
  provider: ProviderId | "newsapi" | "github";
  name: string;
  ok: boolean;
  latencyMs: number;
  status?: number;
  message?: string;
  category: "llm" | "data";
}

const LLM_ENDPOINTS: Record<ProviderId, string> = {
  groq: "https://api.groq.com/openai/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  huggingface: "https://huggingface.co/api/models?limit=1",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  cerebras: "https://api.cerebras.ai/v1/models",
  mistral: "https://api.mistral.ai/v1/models",
  together: "https://api.together.xyz/v1/models",
  cloudflare: "https://api.cloudflare.com/client/v4/user/tokens/verify",
  nvidia: "https://integrate.api.nvidia.com/v1/models",
  "github-models": "https://models.inference.ai.azure.com/models",
  pollinations: "https://text.pollinations.ai/models",
  xai: "https://api.x.ai/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
};

const DATA_ENDPOINTS: Record<string, { name: string; url: string }> = {
  newsapi: { name: "NewsAPI", url: "https://newsapi.org/v2/top-headlines?language=en&pageSize=1" },
  github:  { name: "GitHub API", url: "https://api.github.com" },
};

async function ping(url: string, timeoutMs = 5000): Promise<{ ok: boolean; status?: number; latencyMs: number; message?: string }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return { ok: res.status < 500, status: res.status, latencyMs: Date.now() - started };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : "request failed" };
  }
}

export async function checkProvider(provider: ProviderId, timeoutMs = 5000): Promise<StatusResult> {
  const url = LLM_ENDPOINTS[provider];
  const result = await ping(url, timeoutMs);
  return {
    provider,
    name: PROVIDERS[provider].name,
    category: "llm",
    ...result,
  };
}

export async function checkDataService(id: "newsapi" | "github", timeoutMs = 5000): Promise<StatusResult> {
  const svc = DATA_ENDPOINTS[id];
  const result = await ping(svc.url, timeoutMs);
  return {
    provider: id,
    name: svc.name,
    category: "data",
    ...result,
  };
}

export async function checkAll(): Promise<StatusResult[]> {
  const llmIds = Object.keys(PROVIDERS) as ProviderId[];
  const dataIds: Array<"newsapi" | "github"> = ["newsapi", "github"];
  const [llmResults, dataResults] = await Promise.all([
    Promise.all(llmIds.map((p) => checkProvider(p))),
    Promise.all(dataIds.map((d) => checkDataService(d))),
  ]);
  return [...llmResults, ...dataResults];
}
