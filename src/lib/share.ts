// Serialize a conversation thread to a URL-safe payload for read-only sharing.
// Payload is base64-encoded JSON; large convs are gz-able later if needed.

import type { Conversation, ConvMessage } from "./store";

export interface SharePayload {
  v: 1;
  title: string;
  modelId: string;
  systemPrompt: string;
  messages: Array<Pick<ConvMessage, "role" | "content" | "createdAt" | "modelId">>;
  createdAt: number;
}

function utf8ToBase64Url(s: string): string {
  if (typeof window === "undefined") return Buffer.from(s, "utf8").toString("base64url");
  const utf8 = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((s.length + 3) % 4);
  if (typeof window === "undefined") return Buffer.from(b64, "base64").toString("utf8");
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(u8);
}

export function encodeShare(conv: Conversation, thread: ConvMessage[]): string {
  const payload: SharePayload = {
    v: 1,
    title: conv.title,
    modelId: conv.modelId,
    systemPrompt: conv.systemPrompt,
    createdAt: conv.createdAt,
    messages: thread.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
      createdAt: m.createdAt,
      modelId: m.modelId,
    })),
  };
  return utf8ToBase64Url(JSON.stringify(payload));
}

export function decodeShare(s: string): SharePayload | null {
  try {
    const obj = JSON.parse(base64UrlToUtf8(s)) as SharePayload;
    if (obj.v !== 1 || !Array.isArray(obj.messages)) return null;
    return obj;
  } catch {
    return null;
  }
}
