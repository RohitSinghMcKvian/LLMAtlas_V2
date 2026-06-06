"use client";

// One-shot: ask a small fast model to summarize the first user turn into a short title.
// Falls back gracefully if no key is configured — keep the placeholder title.

import { findModel, MODELS } from "@/lib/models";
import { useSettingsStore } from "@/lib/store";

const PREFERRED_FAST = [
  "groq-llama-3.1-8b",
  "groq-llama-3.3-70b",
  "cerebras-llama-3.1-8b",
  "openrouter-llama-3.1-8b",
];

function pickFastModel(): string | null {
  const keys = useSettingsStore.getState().keys;
  for (const id of PREFERRED_FAST) {
    const m = findModel(id);
    if (m && keys[m.provider]) return id;
  }
  // Any free model whose provider has a key.
  const any = MODELS.find((m) => m.free && keys[m.provider] && !m.disabled);
  return any?.id ?? null;
}

export async function generateTitle(firstUserMessage: string, firstAssistantMessage: string): Promise<string | null> {
  const modelId = pickFastModel();
  if (!modelId) return null;
  const model = findModel(modelId);
  if (!model) return null;
  const apiKey = useSettingsStore.getState().keys[model.provider];
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId,
        apiKey,
        temperature: 0.2,
        maxTokens: 32,
        messages: [
          {
            role: "system",
            content: "You generate ultra-concise chat titles. Reply with ONLY the title — no quotes, no punctuation at the end, 3-7 words, in title case.",
          },
          {
            role: "user",
            content: `User: ${firstUserMessage.slice(0, 500)}\n\nAssistant: ${firstAssistantMessage.slice(0, 500)}\n\nTitle:`,
          },
        ],
      }),
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    const cleaned = text
      .replace(/__LLMATLAS_STREAM_EVENT__.*?__LLMATLAS_STREAM_EVENT__/g, "")
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/\s*Title:\s*/i, "")
      .split("\n")[0]
      .trim()
      .slice(0, 80);
    return cleaned || null;
  } catch {
    return null;
  }
}
