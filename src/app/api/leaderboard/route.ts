// Live leaderboard sync — pulls the OpenRouter public model catalogue
// (https://openrouter.ai/api/v1/models, no auth) every ~10 min and returns a
// SMALL delta the client overlays onto the bundled catalogue:
//   • priceOverrides — fresh context + per-1M pricing for our OpenRouter models
//   • newModels      — models OpenRouter added recently that we don't list yet
// This makes the "synced · Live" badge truthful without a fragile full merge.
// Any failure degrades gracefully to source:"fallback" at HTTP 200 (never throws).

import { NextResponse } from "next/server";
import { MODELS, type Modality } from "@/lib/models";
import type {
  SyncPayload, PriceOverride, NewModelHint, GlobalModelLite,
} from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const NEW_MODEL_WINDOW_DAYS = 45;
const TIMEOUT_MS = 6000;

interface ORModel {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

/** Per-token USD string → per-1M-token USD number. */
function perMillion(price: string | undefined): number {
  const n = Number.parseFloat(price ?? "0");
  return Number.isFinite(n) ? Math.round(n * 1_000_000 * 1000) / 1000 : 0;
}

function vendorFromId(id: string): string {
  const slug = id.split("/")[0] ?? "";
  const map: Record<string, string> = {
    openai: "OpenAI", anthropic: "Anthropic", google: "Google", "meta-llama": "Meta",
    meta: "Meta", deepseek: "DeepSeek", qwen: "Alibaba", mistralai: "Mistral",
    "x-ai": "xAI", nvidia: "Nvidia", moonshotai: "Moonshot AI", "z-ai": "ZAI",
    microsoft: "Microsoft", cohere: "Cohere", minimax: "MiniMax", liquid: "Liquid AI",
    nousresearch: "NousResearch",
  };
  return map[slug] ?? (slug ? slug[0].toUpperCase() + slug.slice(1) : "Unknown");
}

function modalitiesOf(om: ORModel): Modality[] {
  const inputs = om.architecture?.input_modalities ?? [];
  const mods: Modality[] = ["text"];
  if (inputs.includes("image")) mods.push("vision");
  return mods;
}

function cleanName(om: ORModel): string {
  const raw = om.name ?? om.id;
  return raw.replace(/^[^:]+:\s*/, ""); // drop "Vendor: " prefix
}

function emptyPayload(source: SyncPayload["source"]): SyncPayload {
  return {
    updatedAt: new Date().toISOString(),
    source,
    liveModelCount: 0,
    priceOverrides: {},
    newModels: [],
    globalModels: [],
  };
}

export async function GET() {
  // Local OpenRouter models keyed by their OpenRouter id (and a :free-stripped alias).
  const orLocal = new Map<string, string>(); // openrouter-id → local model id
  for (const m of MODELS) {
    if (m.provider !== "openrouter") continue;
    orLocal.set(m.providerModel, m.id);
    orLocal.set(m.providerModel.replace(/:free$/, ""), m.id);
  }
  const localKnownIds = new Set(orLocal.keys());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 600 }, // 10-min upstream cache
    });
    if (!res.ok) {
      return NextResponse.json(emptyPayload("fallback"), { status: 200 });
    }

    const json = (await res.json()) as { data?: ORModel[] };
    const data = Array.isArray(json.data) ? json.data : [];

    const priceOverrides: Record<string, PriceOverride> = {};
    for (const om of data) {
      const localId = orLocal.get(om.id) ?? orLocal.get(om.id.replace(/:free$/, ""));
      if (!localId || om.context_length == null) continue;
      priceOverrides[localId] = {
        context: om.context_length,
        inputPrice: perMillion(om.pricing?.prompt),
        outputPrice: perMillion(om.pricing?.completion),
      };
    }

    const cutoff = Date.now() / 1000 - NEW_MODEL_WINDOW_DAYS * 86400;
    const newModels: NewModelHint[] = data
      .filter(
        (om) =>
          typeof om.created === "number" &&
          om.created >= cutoff &&
          !localKnownIds.has(om.id) &&
          !localKnownIds.has(om.id.replace(/:free$/, "")),
      )
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .slice(0, 12)
      .map((om) => ({
        name: (om.name ?? om.id).replace(/^[^:]+:\s*/, ""), // drop "Vendor: " prefix
        vendor: vendorFromId(om.id),
        context: om.context_length ?? 0,
        created: om.created ?? 0,
      }));

    const globalModels: GlobalModelLite[] = data
      .filter((om) => om.context_length != null && om.id)
      .map((om) => ({
        id: om.id,
        name: cleanName(om),
        vendor: vendorFromId(om.id),
        context: om.context_length ?? 0,
        inputPrice: perMillion(om.pricing?.prompt),
        outputPrice: perMillion(om.pricing?.completion),
        modalities: modalitiesOf(om),
        created: om.created ?? 0,
        description: om.description?.slice(0, 320),
        inCatalog: localKnownIds.has(om.id) || localKnownIds.has(om.id.replace(/:free$/, "")),
      }));

    const payload: SyncPayload = {
      updatedAt: new Date().toISOString(),
      source: "live",
      liveModelCount: data.length,
      priceOverrides,
      newModels,
      globalModels,
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json(emptyPayload("fallback"), { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
