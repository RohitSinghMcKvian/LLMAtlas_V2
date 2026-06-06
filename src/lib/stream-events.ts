// Shared protocol for typed stream events between server route and clients.
// Marker matches providers.ts ERR_MARKER.

export const STREAM_EVENT_MARKER = " __LLMATLAS_STREAM_EVENT__ ";

export type StreamEventKind =
  | "error"
  | "fallback"
  | "tool_call"
  | "tool_result"
  | "artifact_start"
  | "artifact_delta"
  | "artifact_end"
  | "file_chunk"
  | "usage";

export interface StreamEvent {
  kind: StreamEventKind;
  // error / fallback
  status?: number;
  provider?: string;
  modelId?: string;
  fallbackTo?: string;
  code?: string;
  message?: string;
  // tool_call / tool_result
  id?: string;
  name?: string;
  args?: unknown;
  output?: unknown;
  isError?: boolean;
  // artifact_*
  artifactId?: string;
  kindHint?: "html" | "react" | "svg" | "mermaid" | "markdown" | "code";
  title?: string;
  language?: string;
  content?: string;
  // file_chunk
  filename?: string;
  range?: [number, number];
  // usage
  promptTokens?: number;
  completionTokens?: number;
  costUSD?: number;
}

export interface ParsedStream {
  text: string;
  events: StreamEvent[];
}

/** Strip event markers from a buffer; return clean text + collected events. */
export function parseStreamBuffer(buf: string): ParsedStream {
  const events: StreamEvent[] = [];
  if (!buf.includes(STREAM_EVENT_MARKER)) return { text: buf, events };
  const parts = buf.split(STREAM_EVENT_MARKER);
  let text = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      text += parts[i];
    } else {
      try {
        events.push(JSON.parse(parts[i]) as StreamEvent);
      } catch {
        // ignore malformed
      }
    }
  }
  return { text, events };
}

/** Serialize an event for embedding into a stream. */
export function encodeStreamEvent(ev: StreamEvent): string {
  return `${STREAM_EVENT_MARKER}${JSON.stringify(ev)}${STREAM_EVENT_MARKER}`;
}
