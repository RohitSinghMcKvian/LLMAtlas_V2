// Unified API client for all supported free providers.
// Each function returns a ReadableStream of text chunks (server-sent style).

import { findModel, type ModelSpec, type ProviderId } from "./models";


// Marker prefixes the client parses out for typed error/fallback UI.
const ERR_MARKER = " __LLMATLAS_STREAM_EVENT__ ";

export interface StreamEvent {
  kind: "error" | "fallback" | "usage";
  status?: number;
  provider?: ProviderId;
  modelId?: string;
  fallbackTo?: string;
  code?: string;     // e.g. "model_decommissioned", "rate_limited"
  message?: string;
  // usage-specific
  promptTokens?: number;
  completionTokens?: number;
  costUSD?: number;
}

function encodeEvent(ev: StreamEvent): string {
  return `${ERR_MARKER}${JSON.stringify(ev)}${ERR_MARKER}`;
}

function classifyError(status: number, body: string): { code: string; message: string } {
  const lower = body.toLowerCase();
  if (status === 429 || lower.includes("rate-limit") || lower.includes("rate limit")) {
    return { code: "rate_limited", message: "Free model temporarily rate-limited upstream." };
  }
  if (lower.includes("model_decommissioned") || lower.includes("no longer supported") || lower.includes("decommissioned")) {
    return { code: "model_decommissioned", message: "This model was retired by the provider." };
  }
  if (status === 401 || status === 403) {
    return { code: "unauthorized", message: "Missing or invalid API key for this provider." };
  }
  if (status === 404) {
    return { code: "model_not_found", message: "Model not found on provider." };
  }
  if (status >= 500) {
    return { code: "upstream_outage", message: "Upstream provider error. Try again shortly." };
  }
  return { code: "provider_error", message: `Provider error (${status}).` };
}

/** OpenAI-compatible content block — used to deliver images to vision-capable models. */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ToolFunction {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatOptions {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  apiKey?: string; // BYOK override
  tools?: ToolFunction[];
}

/** Flatten content (string or blocks) to a plain text fallback. */
export function contentToText(c: string | ContentBlock[]): string {
  if (typeof c === "string") return c;
  return c
    .map((b) => (b.type === "text" ? b.text : `[image: ${b.image_url.url.slice(0, 60)}…]`))
    .join("\n");
}

export interface ChatResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  provider: ProviderId;
  model: string;
}

function getServerKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case "groq":          return process.env.GROQ_API_KEY;
    case "openrouter":    return process.env.OPENROUTER_API_KEY;
    case "huggingface":   return process.env.HUGGINGFACE_API_KEY;
    case "google":        return process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
    case "cerebras":      return process.env.CEREBRAS_API_KEY;
    case "mistral":       return process.env.MISTRAL_API_KEY;
    case "together":      return process.env.TOGETHER_API_KEY;
    case "cloudflare":    return process.env.CLOUDFLARE_API_KEY ?? process.env.CLOUDFLARE_API_TOKEN;
    case "nvidia":        return process.env.NVIDIA_API_KEY;
    case "github-models": return process.env.GITHUB_TOKEN;
    case "pollinations":  return process.env.POLLINATIONS_TOKEN ?? "keyless"; // operator-side token unlocks the full frontier catalog; "keyless" falls back to anonymous GPT-OSS
    case "xai":           return process.env.XAI_API_KEY;
    case "deepseek":      return process.env.DEEPSEEK_API_KEY;
  }
}

export function hasKey(provider: ProviderId, byok?: string): boolean {
  // Pollinations is keyless — always available, no key needed
  if (provider === "pollinations") return true;
  return !!(byok || getServerKey(provider));
}

// ---------------------------------------------------------------------------
// OpenAI-compatible providers: Groq, OpenRouter, Cerebras, Mistral, Together
// ---------------------------------------------------------------------------
async function chatOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  body: ChatOptions,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const supportsVision = modelSupportsVision(body.modelId);
  const messages = body.messages.map((m) => {
    if (typeof m.content === "string") return m;
    // Vision-capable model — keep blocks. Text-only model — flatten.
    if (supportsVision) return m;
    return { ...m, content: contentToText(m.content) };
  });
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 2048,
      top_p: body.topP ?? 1,
      ...(body.frequencyPenalty ? { frequency_penalty: body.frequencyPenalty } : {}),
      ...(body.presencePenalty ? { presence_penalty: body.presencePenalty } : {}),
      ...(body.tools?.length ? { tools: body.tools, tool_choice: "auto" } : {}),
      stream: true,
    }),
  });
}

function modelSupportsVision(internalId: string): boolean {
  const m = findModel(internalId);
  return !!m && m.modalities.includes("vision");
}

/** Rough cost estimate using ModelSpec prices (USD per 1M tokens). */
function estimateCostUSD(model: ModelSpec, promptTokens?: number, completionTokens?: number): number | undefined {
  if (promptTokens === undefined && completionTokens === undefined) return undefined;
  const p = (promptTokens ?? 0) * (model.inputPrice ?? 0) / 1_000_000;
  const c = (completionTokens ?? 0) * (model.outputPrice ?? 0) / 1_000_000;
  return p + c;
}

async function chatGoogle(
  apiKey: string,
  model: string,
  body: ChatOptions,
): Promise<Response> {
  // Convert OpenAI messages to Google format
  const sysMsg = body.messages.find((m) => m.role === "system")?.content;
  const sys = typeof sysMsg === "string" ? sysMsg : sysMsg ? contentToText(sysMsg) : undefined;
  const contents = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: contentToGoogleParts(m.content),
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
      generationConfig: {
        temperature: body.temperature ?? 0.7,
        maxOutputTokens: body.maxTokens ?? 2048,
        topP: body.topP ?? 1,
      },
    }),
  });
}

/** Convert OpenAI content (string or blocks) to Google parts. */
function contentToGoogleParts(c: string | ContentBlock[]): Array<Record<string, unknown>> {
  if (typeof c === "string") return [{ text: c }];
  return c.map((b) => {
    if (b.type === "text") return { text: b.text };
    // image_url — could be a data URL (data:image/png;base64,...) or http(s) URL
    const url = b.image_url.url;
    if (url.startsWith("data:")) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(url);
      if (m) return { inlineData: { mimeType: m[1], data: m[2] } };
    }
    return { fileData: { mimeType: "image/png", fileUri: url } };
  });
}

async function chatCloudflare(
  accountId: string,
  apiKey: string,
  model: string,
  body: ChatOptions,
): Promise<Response> {
  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: flattenContent(body.messages),
        max_tokens: body.maxTokens ?? 2048,
        temperature: body.temperature ?? 0.7,
        stream: true,
      }),
    },
  );
}

async function chatHuggingface(
  apiKey: string,
  model: string,
  body: ChatOptions,
): Promise<Response> {
  return fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: flattenContent(body.messages),
      temperature: body.temperature ?? 0.7,
      max_tokens: body.maxTokens ?? 1024,
      stream: true,
    }),
  });
}

/** Flatten any content blocks to plain string — for providers without vision support. */
function flattenContent(msgs: ChatMessage[]): Array<{ role: string; content: string }> {
  return msgs.map((m) => ({ role: m.role, content: contentToText(m.content) }));
}

// ---------------------------------------------------------------------------
// Stream parser — normalises every provider's SSE format to plain text chunks
// ---------------------------------------------------------------------------
export async function* parseStream(
  response: Response,
  provider: ProviderId,
  onUsage?: (u: { promptTokens?: number; completionTokens?: number }) => void,
): AsyncGenerator<string> {
  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Provider error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Accumulate native tool_calls from streaming chunks → emit as ```tool blocks
  const pendingCalls: Map<number, { name: string; args: string }> = new Map();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      // SSE comment
      if (line.startsWith(":")) continue;

      // Cloudflare uses both SSE "data:" and raw JSON
      const data = line.startsWith("data:") ? line.slice(5).trim() : line;
      if (data === "[DONE]") {
        // Flush any remaining tool calls
        for (const [, tc] of pendingCalls) {
          yield `\n\`\`\`tool\n{"name": ${JSON.stringify(tc.name)}, "args": ${tc.args || "{}"}}\n\`\`\`\n`;
        }
        pendingCalls.clear();
        return;
      }

      try {
        const json = JSON.parse(data);
        // Usage (OpenAI: trailing chunk; Google: usageMetadata)
        const usage = json.usage ?? json.usageMetadata;
        if (usage && onUsage) {
          onUsage({
            promptTokens: usage.prompt_tokens ?? usage.promptTokenCount,
            completionTokens: usage.completion_tokens ?? usage.candidatesTokenCount,
          });
        }

        // Native tool_calls — accumulate across streaming chunks
        const toolCalls = json.choices?.[0]?.delta?.tool_calls as
          | Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>
          | undefined;
        if (toolCalls) {
          for (const tc of toolCalls) {
            const idx = tc.index ?? 0;
            if (!pendingCalls.has(idx) && tc.function?.name) {
              pendingCalls.set(idx, { name: tc.function.name, args: "" });
            }
            const entry = pendingCalls.get(idx);
            if (entry && tc.function?.arguments) {
              entry.args += tc.function.arguments;
            }
          }
        }

        // Emit accumulated tool calls when finish_reason signals completion
        const finishReason = json.choices?.[0]?.finish_reason;
        if (finishReason && pendingCalls.size > 0) {
          for (const [, tc] of pendingCalls) {
            yield `\n\`\`\`tool\n{"name": ${JSON.stringify(tc.name)}, "args": ${tc.args || "{}"}}\n\`\`\`\n`;
          }
          pendingCalls.clear();
        }

        // Common OpenAI-style text content
        const delta =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.text ??
          json.delta?.content ??
          json.response ??
          // Google Gemini stream
          json.candidates?.[0]?.content?.parts?.[0]?.text ??
          // Cloudflare workers AI
          json.result?.response;

        if (typeof delta === "string" && delta) yield delta;
      } catch {
        // ignore non-JSON heartbeats
      }
    }
  }

  // Flush pending tool calls if stream ended without [DONE]
  for (const [, tc] of pendingCalls) {
    yield `\n\`\`\`tool\n{"name": ${JSON.stringify(tc.name)}, "args": ${tc.args || "{}"}}\n\`\`\`\n`;
  }
}

// ---------------------------------------------------------------------------
// Public entrypoint — dispatches to the right provider with fallback chain
// ---------------------------------------------------------------------------
async function dispatchOne(model: ModelSpec, apiKey: string, options: ChatOptions): Promise<Response> {
  switch (model.provider) {
    case "groq":
      return chatOpenAICompat("https://api.groq.com/openai/v1", apiKey, model.providerModel, options);
    case "openrouter":
      return chatOpenAICompat(
        "https://openrouter.ai/api/v1",
        apiKey,
        model.providerModel,
        options,
        {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "LLMAtlas",
        },
      );
    case "cerebras":
      return chatOpenAICompat("https://api.cerebras.ai/v1", apiKey, model.providerModel, options);
    case "mistral":
      return chatOpenAICompat("https://api.mistral.ai/v1", apiKey, model.providerModel, options);
    case "together":
      return chatOpenAICompat("https://api.together.xyz/v1", apiKey, model.providerModel, options);
    case "nvidia":
      return chatOpenAICompat("https://integrate.api.nvidia.com/v1", apiKey, model.providerModel, options);
    case "github-models":
      return chatOpenAICompat("https://models.inference.ai.azure.com", apiKey, model.providerModel, options);
    case "pollinations": {
      // With an operator-side token (POLLINATIONS_TOKEN), use the modern gateway which
      // serves the full frontier catalogue (Claude, GPT-5, DeepSeek, Kimi, MiniMax, …).
      // Without one, fall back to the legacy anonymous endpoint (GPT-OSS family only).
      const hasToken = !!apiKey && apiKey !== "keyless";
      const base = hasToken ? "https://gen.pollinations.ai/v1" : "https://text.pollinations.ai/openai";
      return chatOpenAICompat(base, apiKey, model.providerModel, options);
    }
    case "xai":
      return chatOpenAICompat("https://api.x.ai/v1", apiKey, model.providerModel, options);
    case "deepseek":
      return chatOpenAICompat("https://api.deepseek.com/v1", apiKey, model.providerModel, options);
    case "google":
      return chatGoogle(apiKey, model.providerModel, options);
    case "huggingface":
      return chatHuggingface(apiKey, model.providerModel, options);
    case "cloudflare": {
      const acctId = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!acctId) throw new Error("CLOUDFLARE_ACCOUNT_ID is required for Cloudflare Workers AI.");
      return chatCloudflare(acctId, apiKey, model.providerModel, options);
    }
    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

interface AttemptResult {
  ok: boolean;
  response?: Response;
  status?: number;
  body?: string;
  model: ModelSpec;
}

// Pollinations models that the keyless/anonymous endpoint actually serves. Everything else
// (Claude, GPT-5, DeepSeek, Kimi, MiniMax, …) requires an operator token; without one the
// anonymous endpoint returns empty 200 responses, so we must not attempt them keyless.
const POLLINATIONS_ANON_SAFE = new Set(["openai", "openai-fast"]);

async function attemptOnce(model: ModelSpec, options: ChatOptions): Promise<AttemptResult> {
  const apiKey = options.apiKey || getServerKey(model.provider);
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      body: `No API key configured for ${model.provider}. Add it in Settings (BYOK) or .env.local.`,
      model,
    };
  }
  // Skip Pollinations frontier models when no operator token is set — the anonymous endpoint
  // returns empty 200s for them, which would look like "success" and never trigger a fallback.
  if (model.provider === "pollinations" && apiKey === "keyless" && !POLLINATIONS_ANON_SAFE.has(model.providerModel)) {
    return {
      ok: false,
      status: 503,
      body: `${model.name} needs POLLINATIONS_TOKEN to serve keyless — routing to a fallback provider.`,
      model,
    };
  }
  try {
    const response = await dispatchOne(model, apiKey, options);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, status: response.status, body: text, model };
    }
    return { ok: true, response, model };
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err), model };
  }
}

export async function streamChat(
  options: ChatOptions,
): Promise<{ stream: ReadableStream<Uint8Array>; provider: ProviderId; model: string }> {
  const primary = findModel(options.modelId);
  if (!primary) throw new Error(`Unknown model: ${options.modelId}`);

  // Auto-redirect disabled models
  const effective = primary.disabled && primary.replacedBy ? (findModel(primary.replacedBy) ?? primary) : primary;

  // Build attempt chain: effective + fallbacks
  const chain: ModelSpec[] = [effective];
  for (const fid of effective.fallbacks ?? []) {
    const f = findModel(fid);
    if (f && !chain.some(c => c.id === f.id)) chain.push(f);
  }

  const encoder = new TextEncoder();
  let lastFailure: AttemptResult | null = null;
  let usedModel: ModelSpec | null = null;
  let response: Response | null = null;
  const events: StreamEvent[] = [];

  for (let i = 0; i < chain.length; i++) {
    const m = chain[i];
    const r = await attemptOnce(m, options);
    if (r.ok && r.response) {
      usedModel = m;
      response = r.response;
      if (i > 0) {
        events.push({
          kind: "fallback",
          modelId: chain[0].id,
          fallbackTo: m.id,
          message: `Original model ${chain[0].name} unavailable — using ${m.name}.`,
        });
      }
      break;
    }
    // Any failure (network error/status 0, auth 401/403, 404, 429, 5xx, …) cascades to the
    // next entry in the chain. Each entry may be a different provider, so trying the next is
    // always worthwhile. We only surface an error if the entire chain is exhausted.
    lastFailure = r;
  }

  if (!response || !usedModel) {
    const f = lastFailure ?? { status: 500, body: "no provider attempted", model: effective };
    const { code, message } = classifyError(f.status ?? 500, f.body ?? "");
    const ev: StreamEvent = {
      kind: "error",
      status: f.status,
      provider: f.model.provider,
      modelId: f.model.id,
      code,
      message,
    };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(encodeEvent(ev)));
        controller.close();
      },
    });
    return { stream, provider: f.model.provider, model: f.model.providerModel };
  }

  const finalModel = usedModel;
  const finalResponse = response;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const ev of events) controller.enqueue(encoder.encode(encodeEvent(ev)));
        let usageEv: StreamEvent | null = null;
        for await (const chunk of parseStream(finalResponse, finalModel.provider, (u) => {
          const cost = estimateCostUSD(finalModel, u.promptTokens, u.completionTokens);
          usageEv = {
            kind: "usage",
            provider: finalModel.provider,
            modelId: finalModel.id,
            promptTokens: u.promptTokens,
            completionTokens: u.completionTokens,
            costUSD: cost,
          };
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
        if (usageEv) controller.enqueue(encoder.encode(encodeEvent(usageEv)));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const ev: StreamEvent = {
          kind: "error",
          provider: finalModel.provider,
          modelId: finalModel.id,
          code: "stream_aborted",
          message: msg,
        };
        controller.enqueue(encoder.encode(encodeEvent(ev)));
        controller.close();
      }
    },
  });

  return { stream, provider: finalModel.provider, model: finalModel.providerModel };
}

// ---------------------------------------------------------------------------
// Non-streaming convenience for short calls (used by tutor, classifiers, etc.)
// ---------------------------------------------------------------------------
export async function chatOnce(options: ChatOptions): Promise<ChatResult> {
  const model = findModel(options.modelId);
  if (!model) throw new Error(`Unknown model: ${options.modelId}`);
  const started = Date.now();
  const { stream } = await streamChat(options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    content += decoder.decode(value, { stream: true });
  }
  const latencyMs = Date.now() - started;
  const promptTokens = Math.ceil(
    options.messages.reduce((a, m) => a + m.content.length, 0) / 4,
  );
  const completionTokens = Math.ceil(content.length / 4);
  return {
    content,
    promptTokens,
    completionTokens,
    latencyMs,
    provider: model.provider,
    model: model.providerModel,
  };
}
