// Artifact extraction utilities.
// Detects two patterns in assistant message content:
//   1. <artifact identifier="..." type="..." title="..."> ... </artifact>  (Claude.ai style)
//   2. Sufficiently large fenced code blocks of supported kinds (```html, ```svg, ```mermaid, ```jsx, ```tsx, ```python, ```js, ```ts, ...)
//
// Output is a list of detection descriptors that the playground page maps into the artifact store.

import type { ArtifactKind } from "./store";

export interface ArtifactDetection {
  /** Stable identity within a single message — used as externalId for the artifact store. */
  externalId: string;
  kind: ArtifactKind;
  title: string;
  language?: string;
  content: string;
  /** Character range inside the source message content. Useful for placing inline affordances. */
  range: [number, number];
}

const MIN_FENCE_LINES_FOR_ARTIFACT = 8;

const LANGUAGE_TO_KIND: Record<string, ArtifactKind> = {
  html: "html",
  htm: "html",
  svg: "svg",
  mermaid: "mermaid",
  md: "markdown",
  markdown: "markdown",
  jsx: "react",
  tsx: "react",
  // Ultra-Capability Layer artifact tags
  pdf: "pdf",
  chart: "chart",
  chartjs: "chart",
  "chart-js": "chart",
  vega: "chart",
  "vega-lite": "chart",
  vegalite: "chart",
  plotly: "chart",
  three: "three",
  threejs: "three",
  "three-js": "three",
  webgl: "three",
  audio: "audio",
  tone: "audio",
  tonejs: "audio",
  music: "audio",
  map: "map",
  leaflet: "map",
  geojson: "map",
  spreadsheet: "spreadsheet",
  xlsx: "spreadsheet",
  excel: "spreadsheet",
  csv: "spreadsheet",
  mindmap: "mindmap",
  markmap: "mindmap",
  whiteboard: "whiteboard",
  excalidraw: "whiteboard",
};

export function detectArtifacts(content: string): ArtifactDetection[] {
  if (!content) return [];
  const out: ArtifactDetection[] = [];

  // 1. <artifact> tags
  const tagRe = /<artifact(?:\s+[^>]*)?>([\s\S]*?)<\/artifact>/g;
  const attrRe = /(\w+)\s*=\s*"([^"]*)"/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRe.exec(content))) {
    const full = tagMatch[0];
    const inner = tagMatch[1].trim();
    const attrs: Record<string, string> = {};
    let am: RegExpExecArray | null;
    const attrBlob = full.slice(0, full.indexOf(">") + 1);
    while ((am = attrRe.exec(attrBlob))) attrs[am[1]] = am[2];

    const norm = normalizeArtifactBody(inner, attrs.type || attrs.kind, attrs.language);
    out.push({
      externalId: attrs.identifier || attrs.id || `tag-${tagMatch.index}`,
      kind: norm.kind,
      title: attrs.title || inferTitleFromContent(norm.content) || "Artifact",
      language: norm.language,
      content: norm.content,
      range: [tagMatch.index, tagMatch.index + full.length],
    });
  }

  // 2. Fenced code blocks ``` ... ```
  const fenceRe = /```([a-zA-Z0-9_+\-]*)\n([\s\S]*?)```/g;
  let fm: RegExpExecArray | null;
  while ((fm = fenceRe.exec(content))) {
    // Skip if this fence sits inside an already-captured <artifact> range.
    if (out.some((d) => fm!.index >= d.range[0] && fm!.index < d.range[1])) continue;

    const lang = (fm[1] || "").toLowerCase();
    const body = fm[2];
    const lineCount = body.split("\n").length;
    const isVisualKind = lang in LANGUAGE_TO_KIND;
    if (!isVisualKind && lineCount < MIN_FENCE_LINES_FOR_ARTIFACT) continue;

    const kind: ArtifactKind = LANGUAGE_TO_KIND[lang] ?? "code";
    out.push({
      externalId: `fence-${fm.index}-${lang}`,
      kind,
      title: inferTitleFromContent(body) || titleForKind(kind, lang),
      language: lang || undefined,
      content: body,
      range: [fm.index, fm.index + fm[0].length],
    });
  }

  out.sort((a, b) => a.range[0] - b.range[0]);
  return out;
}

const ARTIFACT_KINDS = new Set<ArtifactKind>([
  "html", "react", "svg", "mermaid", "markdown", "code",
  "pdf", "chart", "three", "audio", "map", "spreadsheet", "mindmap", "whiteboard",
]);

function resolveKind(declaredKind: string, lang: string): ArtifactKind {
  if (ARTIFACT_KINDS.has(declaredKind as ArtifactKind)) return declaredKind as ArtifactKind;
  if (declaredKind in LANGUAGE_TO_KIND) return LANGUAGE_TO_KIND[declaredKind];
  if (lang in LANGUAGE_TO_KIND) return LANGUAGE_TO_KIND[lang];
  return "code";
}

/**
 * Strip a single wrapping ``` fence from text. Handles a fully-closed fence and,
 * for mid-stream content, an unclosed leading fence. Returns the inner content plus
 * the fence language (if any). This defends against models that wrap a fenced code
 * block *inside* an <artifact> tag — otherwise the backticks reach a renderer (e.g.
 * Babel sees ```html and throws "Unterminated template").
 */
export function stripWrappingCodeFence(raw: string): { content: string; lang?: string } {
  const body = raw.trim();
  if (!body.startsWith("```")) return { content: raw };
  // Whole body wrapped in a closed fence.
  let m = /^```([a-zA-Z0-9_+\-]*)[ \t]*\r?\n([\s\S]*?)\r?\n?```$/.exec(body);
  if (m && !m[2].includes("```")) return { content: m[2], lang: (m[1] || "").toLowerCase() || undefined };
  // Unclosed leading fence (content still streaming in).
  m = /^```([a-zA-Z0-9_+\-]*)[ \t]*\r?\n([\s\S]*)$/.exec(body);
  if (m && !m[2].includes("```")) return { content: m[2], lang: (m[1] || "").toLowerCase() || undefined };
  return { content: raw };
}

/**
 * Normalize an <artifact> tag body: unwrap any inner code fence and choose the most
 * reliable kind. The inner fence language (the immediate wrapper of the content)
 * overrides the declared `type` attribute, so `<artifact type="react">` wrapping a
 * ```html block is correctly rendered as HTML rather than fed to the React/Babel path.
 */
function normalizeArtifactBody(
  rawInner: string,
  declaredType: string | undefined,
  declaredLang: string | undefined,
): { content: string; kind: ArtifactKind; language?: string } {
  const stripped = stripWrappingCodeFence(rawInner);
  const lang = (declaredLang || "").toLowerCase();
  const kind = stripped.lang
    ? resolveKind(stripped.lang, stripped.lang)
    : resolveKind((declaredType || "").toLowerCase(), lang);
  return { content: stripped.content.trim(), kind, language: stripped.lang || lang || undefined };
}

/**
 * Streaming-aware detection: returns all fully-closed artifacts PLUS a single
 * trailing artifact that is still being written (an unclosed ``` fence or an
 * unclosed <artifact> tag). This is what powers the "build it live in the panel"
 * experience — the panel updates on every frame as the model emits content.
 */
export function detectArtifactsStreaming(content: string): ArtifactDetection[] {
  if (!content) return [];
  const out = detectArtifacts(content);
  const lastEnd = out.reduce((m, d) => Math.max(m, d.range[1]), 0);
  const tail = content.slice(lastEnd);

  // Unclosed <artifact ...> tag.
  const openTag = /<artifact(?:\s+[^>]*)?>([\s\S]*)$/.exec(tail);
  if (openTag && !/<\/artifact>/i.test(tail)) {
    const attrBlob = openTag[0].slice(0, openTag[0].indexOf(">") + 1);
    const attrs: Record<string, string> = {};
    const attrRe = /(\w+)\s*=\s*"([^"]*)"/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrBlob))) attrs[am[1]] = am[2];
    const norm = normalizeArtifactBody(openTag[1], attrs.type || attrs.kind, attrs.language);
    if (norm.content.length > 0) {
      out.push({
        externalId: attrs.identifier || attrs.id || `tag-${lastEnd + openTag.index}`,
        kind: norm.kind,
        title: attrs.title || inferTitleFromContent(norm.content) || titleForKind(norm.kind, norm.language || ""),
        language: norm.language,
        content: norm.content,
        range: [lastEnd + openTag.index, content.length],
      });
      return out.sort((a, b) => a.range[0] - b.range[0]);
    }
  }

  // Unclosed ``` fenced block.
  const openFence = /```([a-zA-Z0-9_+\-]*)\n([\s\S]*)$/.exec(tail);
  if (openFence && !openFence[2].includes("```")) {
    const lang = (openFence[1] || "").toLowerCase();
    const body = openFence[2];
    const isVisualKind = lang in LANGUAGE_TO_KIND;
    if (isVisualKind || body.split("\n").length >= MIN_FENCE_LINES_FOR_ARTIFACT) {
      const kind: ArtifactKind = LANGUAGE_TO_KIND[lang] ?? "code";
      out.push({
        externalId: `fence-${lastEnd + openFence.index}-${lang}`,
        kind,
        title: inferTitleFromContent(body) || titleForKind(kind, lang),
        language: lang || undefined,
        content: body,
        range: [lastEnd + openFence.index, content.length],
      });
    }
  }
  return out.sort((a, b) => a.range[0] - b.range[0]);
}

function inferTitleFromContent(body: string): string | undefined {
  const first = body.split("\n").find((l) => l.trim().length > 0) ?? "";
  // <title>X</title>
  const t = /<title>([^<]+)<\/title>/i.exec(first);
  if (t) return t[1].trim();
  // # Heading
  const h = /^\s*#\s+(.+)/.exec(first);
  if (h) return h[1].trim().slice(0, 60);
  return undefined;
}

function titleForKind(kind: ArtifactKind, lang: string): string {
  switch (kind) {
    case "html": return "HTML preview";
    case "svg": return "SVG image";
    case "mermaid": return "Mermaid diagram";
    case "markdown": return "Markdown document";
    case "react": return "React component";
    case "code": return lang ? `${lang} snippet` : "Code snippet";
    case "pdf": return "PDF document";
    case "chart": return "Chart";
    case "three": return "3D scene";
    case "audio": return "Audio composition";
    case "map": return "Map";
    case "spreadsheet": return "Spreadsheet";
    case "mindmap": return "Mind map";
    case "whiteboard": return "Whiteboard";
  }
}
