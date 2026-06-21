// ─────────────────────────────────────────────────────────────────────────────
// Atlas Brain — embedding endpoint (Phase 3: persistent memory / RAG)
//
// The agent loop runs client-side, but text embeddings are best computed where
// API keys live (the server). This stateless route turns a batch of strings into
// vectors the memory store ranks with cosine similarity.
//
// Default backend is `local` — a deterministic, keyless hashing embedding — so
// memory works with zero configuration (consistent with LLMAtlas's keyless
// ethos) and every request stays fast (no network round-trip). Operators who
// have verified higher-quality embedding credentials opt in explicitly with
// EMBED_BACKEND, and the route still degrades gracefully to local on any remote
// failure:
//   • EMBED_BACKEND=google      — text-embedding-004        (GOOGLE_AI_API_KEY)
//   • EMBED_BACKEND=cloudflare   — @cf/baai/bge-base-en-v1.5 (CF acct + token)
//   • EMBED_BACKEND=huggingface  — all-MiniLM-L6-v2          (HUGGINGFACE_API_KEY)
//   • EMBED_BACKEND=local (default) — hashing embedding, 384-dim, no key
//
// The response always reports which `model`/`dim` produced the vectors so the
// client can detect a backend change and avoid comparing vectors of different
// dimensionality.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_DIM = 1024;
const MAX_TEXTS = 64;
const MAX_CHARS = 8_000;

// Common English stopwords add noise (every sentence shares them) — dropping
// them sharpens similarity onto the content words that actually matter.
const STOPWORDS = new Set(
  ("a an and are as at be but by do does for from had has have how i if in into is it its my me " +
    "no not of on or our should so some that the their then there these they this to up us was we " +
    "what when where which who will with you your")
    .split(" "),
);

type Backend = "local" | "google" | "cloudflare" | "huggingface";

// ── Local hashing embedding (keyless, deterministic) ─────────────────────────
// Bag-of-features hashing vectorizer: lowercase word tokens + their character
// 3-grams are hashed into LOCAL_DIM buckets with a sign hash, TF-weighted, then
// L2-normalised. Good enough for lexical/near-semantic recall with no network.

function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function localEmbed(text: string): number[] {
  const vec = new Float64Array(LOCAL_DIM);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
  const tokens = clean.split(/\s+/).filter((t) => t && !STOPWORDS.has(t));
  const addFeature = (feat: string, weight: number) => {
    const h = hash32(feat);
    const bucket = h % LOCAL_DIM;
    const sign = (h & 0x100) === 0 ? 1 : -1; // independent-ish sign bit
    vec[bucket] += sign * weight;
  };
  for (const tok of tokens) {
    // Whole-word match is the strongest signal.
    addFeature("w:" + tok, 1);
    // Stemmed prefix collapses plurals / tense (typescript ≈ typescripts).
    if (tok.length >= 5) addFeature("p:" + tok.slice(0, 5), 0.6);
    // Character 4-grams (longer tokens only) capture morphology with far fewer
    // spurious collisions than 3-grams, at a low weight.
    if (tok.length >= 6) {
      const padded = `^${tok}$`;
      for (let i = 0; i + 4 <= padded.length; i++) {
        addFeature("g:" + padded.slice(i, i + 4), 0.25);
      }
    }
  }
  // L2 normalise so dot product == cosine similarity on the client.
  let norm = 0;
  for (let i = 0; i < LOCAL_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(LOCAL_DIM);
  for (let i = 0; i < LOCAL_DIM; i++) out[i] = vec[i] / norm;
  return out;
}

// ── Remote backends ──────────────────────────────────────────────────────────

async function googleEmbed(texts: string[], key: string): Promise<number[][]> {
  // Batch endpoint keeps it to a single request.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: "models/text-embedding-004",
          content: { parts: [{ text: t }] },
        })),
      }),
    },
  );
  if (!res.ok) throw new Error(`google embed ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as { embeddings?: Array<{ values: number[] }> };
  if (!json.embeddings) throw new Error("google embed: empty response");
  return json.embeddings.map((e) => l2(e.values));
}

async function cloudflareEmbed(texts: string[], acct: string, token: string): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/baai/bge-base-en-v1.5`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: texts }),
    },
  );
  if (!res.ok) throw new Error(`cloudflare embed ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as { result?: { data?: number[][] } };
  const data = json.result?.data;
  if (!data) throw new Error("cloudflare embed: empty response");
  return data.map(l2);
}

async function hfEmbed(texts: string[], key: string): Promise<number[][]> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    },
  );
  if (!res.ok) throw new Error(`hf embed ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = (await res.json()) as number[][] | { embeddings?: number[][] };
  const data = Array.isArray(json) ? json : json.embeddings;
  if (!data) throw new Error("hf embed: empty response");
  return data.map(l2);
}

/** L2-normalise a vector so cosine == dot product downstream. */
function l2(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

function resolveBackend(): { backend: Backend; model: string } {
  const forced = (process.env.EMBED_BACKEND as Backend | undefined) ?? undefined;
  const hasGoogle = !!(process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_API_KEY);
  const hasCf = !!(process.env.CLOUDFLARE_ACCOUNT_ID && (process.env.CLOUDFLARE_API_KEY ?? process.env.CLOUDFLARE_API_TOKEN));
  const hasHf = !!process.env.HUGGINGFACE_API_KEY;

  const pick = (b: Backend): { backend: Backend; model: string } => {
    switch (b) {
      case "google": return { backend: "google", model: "google/text-embedding-004" };
      case "cloudflare": return { backend: "cloudflare", model: "cloudflare/bge-base-en-v1.5" };
      case "huggingface": return { backend: "huggingface", model: "hf/all-MiniLM-L6-v2" };
      default: return { backend: "local", model: "local/hash-v2" };
    }
  };

  // Remote backends are opt-in via EMBED_BACKEND only — otherwise default to the
  // fast, keyless local backend (avoids a network round-trip on every request).
  if (forced === "google") return hasGoogle ? pick("google") : pick("local");
  if (forced === "cloudflare") return hasCf ? pick("cloudflare") : pick("local");
  if (forced === "huggingface") return hasHf ? pick("huggingface") : pick("local");
  return pick("local");
}

export async function POST(req: Request) {
  let body: { texts?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const rawTexts = Array.isArray(body.texts) ? body.texts : [];
  const texts = rawTexts
    .filter((t): t is string => typeof t === "string")
    .slice(0, MAX_TEXTS)
    .map((t) => t.slice(0, MAX_CHARS));

  if (texts.length === 0) {
    return NextResponse.json({ ok: false, error: "texts must be a non-empty string array" }, { status: 400 });
  }

  const { backend, model } = resolveBackend();

  try {
    let embeddings: number[][];
    switch (backend) {
      case "google":
        embeddings = await googleEmbed(texts, (process.env.GOOGLE_AI_API_KEY ?? process.env.GOOGLE_API_KEY)!);
        break;
      case "cloudflare":
        embeddings = await cloudflareEmbed(
          texts,
          process.env.CLOUDFLARE_ACCOUNT_ID!,
          (process.env.CLOUDFLARE_API_KEY ?? process.env.CLOUDFLARE_API_TOKEN)!,
        );
        break;
      case "huggingface":
        embeddings = await hfEmbed(texts, process.env.HUGGINGFACE_API_KEY!);
        break;
      default:
        embeddings = texts.map(localEmbed);
    }
    return NextResponse.json({ ok: true, model, dim: embeddings[0]?.length ?? LOCAL_DIM, embeddings });
  } catch (e) {
    // Any remote failure degrades gracefully to the local backend so memory
    // never hard-fails on a flaky/rate-limited embedding provider.
    const embeddings = texts.map(localEmbed);
    return NextResponse.json({
      ok: true,
      model: "local/hash-v2",
      dim: LOCAL_DIM,
      embeddings,
      degraded: e instanceof Error ? e.message : "remote embed failed; used local backend",
    });
  }
}
