// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Capability Layer — System-prompt composer
//
// Single entrypoint every surface uses to BUILD the system prompt that gets
// sent to /api/chat. It glues together (in order):
//
//   [base persona] + [mode primer] + [capability primers] + [skill instructions]
//   + [creator-suite catalogue] + [tool catalogue (when surface uses tools)]
//
// The output is a coherent block of instructions that turns any model into a
// Hermes/Claude-Code-Ultra-grade creator. Keeping this in one place means a
// change to the ultra capabilities updates Playground, Compare, Atlas, /code,
// and Learn at once.
// ─────────────────────────────────────────────────────────────────────────────

import { composeCapabilityPrimers, CAPABILITIES, type CapabilityId } from "./capabilities";
import { modePrimer, type UltraMode } from "./modes";

export const UCL_BASE_PRIMER = `
You are an ultra-capable AI assistant in LLMAtlas. You can perform any complex creative or analytical task — writing presentations, documents, applications, interactive games, data analyses, research reports, or any other deliverable the user asks for — at the quality bar of a senior expert in that domain.

Operating principles:
  • UNDERSTAND first. Restate ambiguous requests in your head before answering. If the request is genuinely under-specified, ASK ONE pointed question, then proceed.
  • MATCH the deliverable to the request. A "build me a game" request expects a playable game, not a paragraph describing one. A "write me a report" expects a polished document, not bullet points. Use artifacts liberally.
  • PUSH for quality. Real content, complete edge cases, no TODOs, no lorem ipsum. Information density and finish like a top-tier product, not a draft.
  • BE CONCISE outside the artifact — the value is INSIDE the deliverable. Two-line preamble, the artifact, one-line outro.
`.trim();

/** A compact reference of every creator capability the model can opt into. */
const CAPABILITY_CATALOGUE = (() => {
  const rows = CAPABILITIES.map((c) => `  ${c.emoji} ${c.label} — ${c.blurb}`).join("\n");
  return `
CREATOR CAPABILITIES AVAILABLE
You can produce any of these on demand. Pick the one(s) that best match the user's request:
${rows}

When emitting any of these, wrap the work in an <artifact identifier="…" type="html|svg|mermaid|markdown|react|code" title="…"> tag so the surface renders it in a live panel. Reuse the SAME identifier when revising.`.trim();
})();

/** The richer (multi-kind) artifact primer used in Playground/Atlas. Adds the
 *  catalogue + the deep-format instructions for each artifact kind. */
const ARTIFACT_PRIMER = `
ARTIFACT FORMATS — choose the one that best fits the deliverable. Each fence becomes a live, interactive preview in a side panel.

  CORE
  - \`\`\`html ... \`\`\` — complete HTML doc. Tailwind preloaded. <script> + inline <style> allowed.
  - \`\`\`svg ... \`\`\` — SVG illustration (include viewBox + <title>).
  - \`\`\`mermaid ... \`\`\` — labeled diagrams.
  - \`\`\`markdown ... \`\`\` — long structured docs (GFM tables, KaTeX math, mermaid blocks).
  - \`\`\`jsx / tsx ... \`\`\` — React. Default-export top-level App. Libs: react, lucide-react, recharts, framer-motion, clsx, tailwind-merge, date-fns. Tailwind preloaded.

  ULTRA-CAPABILITY (use these instead of trying to fake them with HTML/React)
  - \`\`\`pdf ... \`\`\` — Real PDF document. Write polished MARKDOWN (preferred) and it auto-renders to a previewable + downloadable .pdf via html2pdf. For precision use a jsPDF snippet (\`new jsPDF()\` is available; end with \`__send(doc.output('blob'))\`); jspdf-autotable also preloaded.
  - \`\`\`chart ... \`\`\` — Interactive chart. JSON spec — Chart.js v4 config OR Vega-Lite OR Plotly figure (auto-detected). Pick the right type, label axes, no rainbow palettes.
  - \`\`\`three ... \`\`\` — 3D scene. Snippet runs with \`THREE\`, \`scene\`, \`camera\`, \`renderer\`, \`controls\` (OrbitControls), and basic lights preloaded. Define \`window.update = (t) => { ... }\` for animation.
  - \`\`\`audio ... \`\`\` — Generative music / SFX. Tone.js preloaded. Renderer shows Play/Stop + waveform. Use Tone.Synth/Sequence/Transport; call \`window.__onStop(fn)\` to register cleanup.
  - \`\`\`map ... \`\`\` — Interactive map. JSON GeoJSON FeatureCollection (auto-styled) OR Leaflet snippet (\`L\` + \`map\` preloaded over OSM tiles). Real lng/lat coords.
  - \`\`\`spreadsheet ... \`\`\` — Editable grid + real .xlsx/.csv export. CSV body, or JSON \`{ name, columns, rows }\`, or array-of-objects.
  - \`\`\`mindmap ... \`\`\` — Interactive mind map. Markmap markdown (H1 root, H2/H3 branches, bullets for leaves).
  - \`\`\`whiteboard ... \`\`\` — Excalidraw scene. JSON array of elements (rect/ellipse/text/arrow with x/y/width/height).

  Any other language tag is treated as plain code (python, sql, rust, go, …).

Wrap any artifact in <artifact identifier="stable-id" type="…" title="Short title"> so the panel versions it in place when you revise.
`.trim();

export interface ComposeSystemPromptArgs {
  /** Existing surface persona / preset (Playground's PRESET or the agent's prompt). */
  basePrompt?: string;
  mode?: UltraMode;
  /** Capability primers to inject, in order. Use [] if none. */
  capabilities?: CapabilityId[];
  /** Active-skill instructions (from brain/skills.ts). */
  skillInstructions?: string;
  /** Persistent-memory block (from brain/memory.ts). */
  memoryContext?: string;
  /** True if the surface renders artifacts (playground, compare, learn). */
  includeArtifactPrimer?: boolean;
  /** True if the surface advertises the full capability catalogue. */
  includeCapabilityCatalogue?: boolean;
}

/**
 * Compose the full system prompt that goes to /api/chat.
 *
 * Order is deliberate — base persona FIRST so the surface's voice wins,
 * then the UCL primers refine HOW the model thinks/produces.
 */
export function composeSystemPrompt(args: ComposeSystemPromptArgs): string {
  const parts: string[] = [];
  const base = args.basePrompt?.trim();
  if (base) parts.push(base);

  parts.push(UCL_BASE_PRIMER);

  const mode = modePrimer(args.mode ?? "standard");
  if (mode) parts.push(mode);

  if (args.includeCapabilityCatalogue) parts.push(CAPABILITY_CATALOGUE);

  if (args.capabilities && args.capabilities.length) {
    const primer = composeCapabilityPrimers(args.capabilities);
    if (primer) parts.push(primer);
  }

  if (args.includeArtifactPrimer) parts.push(ARTIFACT_PRIMER);

  const skill = args.skillInstructions?.trim();
  if (skill) parts.push(skill);

  const mem = args.memoryContext?.trim();
  if (mem) parts.push(mem);

  return parts.filter(Boolean).join("\n\n");
}
