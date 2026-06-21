// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Capability Layer — Creator Scaffolds
//
// A capability is a high-leverage skill primer that turns any chat model into
// a domain expert for one specific output kind. Each capability ships:
//   • a stable `id` and friendly `label`
//   • a `system` primer that's injected into the model's prompt
//   • optional `triggers` for auto-detection from user input
//   • `outputs` — what artifact kinds the model is expected to emit
//
// These are LLM-agnostic — any model that follows instructions can render them.
// The primers are deliberately kept short and concrete so they survive context
// pressure across small / large models alike (Hermes & Claude-style framing).
// ─────────────────────────────────────────────────────────────────────────────

export type CapabilityId =
  | "presentation"
  | "document"
  | "spreadsheet"
  | "report"
  | "fullstack-app"
  | "game"
  | "diagram"
  | "data-analysis"
  | "research"
  | "voice-script"
  | "marketing-copy"
  | "tutor"
  // Ultra-Capability creators backed by dedicated artifact renderers
  | "pdf-author"
  | "chart-studio"
  | "three-designer"
  | "audio-composer"
  | "map-maker"
  | "mindmap-builder"
  | "whiteboard"
  | "image-art"
  | "simulation";

export interface Capability {
  id: CapabilityId;
  label: string;
  emoji: string;
  blurb: string;
  triggers: string[];
  system: string;
  /** Artifact kinds the model should emit (informational, used by the UI). */
  outputs: Array<"html" | "markdown" | "svg" | "mermaid" | "react" | "code">;
}

/** Every capability that ships with LLMAtlas Ultra. */
export const CAPABILITIES: Capability[] = [
  {
    id: "presentation",
    label: "Presentation Maker",
    emoji: "🎤",
    blurb: "Build a slide deck — title, content slides, speaker notes.",
    triggers: ["slide", "deck", "presentation", "pitch", "keynote", "pptx", "powerpoint"],
    outputs: ["html", "markdown"],
    system: [
      "PRESENTATION CAPABILITY",
      "When asked to create a slide deck or presentation, output it as a SINGLE self-contained HTML artifact:",
      '  <artifact identifier="deck" type="html" title="Deck title">',
      "    a complete <html> document with <style> using Tailwind utility classes (already preloaded);",
      "    each slide is a <section class=\"slide\"> the size of a 16:9 viewport (h-screen w-screen p-12 flex flex-col);",
      "    show ONE slide at a time and navigate with ArrowLeft/ArrowRight + a tiny dot-pager + Space (next); persist current slide in URL hash;",
      "    include a title slide, 6-12 content slides (each with a clear heading, 2-5 bullets or one strong visual), and a closing slide;",
      "    accompany each slide with a <aside class=\"speaker-notes hidden\">…</aside> the user can reveal with the N key;",
      "    use a tasteful gradient backdrop, readable typography (text-4xl headings, text-xl body), and subtle motion via CSS transitions only.",
      "  </artifact>",
      "Bullets are short. Real content, not lorem ipsum. Match the topic with relevant emoji or a Lucide-via-inline-SVG accent on each slide.",
    ].join("\n"),
  },
  {
    id: "document",
    label: "Document Author",
    emoji: "📄",
    blurb: "Long-form structured document — report, memo, proposal, letter.",
    triggers: ["document", "report", "memo", "proposal", "letter", "essay", "whitepaper", "docx", "word doc"],
    outputs: ["markdown"],
    system: [
      "DOCUMENT CAPABILITY",
      "When asked to author a document, output it as a single rich markdown artifact:",
      '  <artifact identifier="doc" type="markdown" title="Document title">',
      "    a polished structure: title (H1), one-line subtitle, table of contents, then numbered H2 sections;",
      "    use tables, blockquotes, callouts (>), task lists, definition lists where they help;",
      "    KaTeX math via $...$ and $$...$$ for equations; mermaid blocks for flow/architecture; ascii or SVG diagrams when richer;",
      "    end with a sources / appendix section if the topic warrants citations.",
      "  </artifact>",
      "Tone matches the kind (memo: terse; proposal: confident; letter: warm). NEVER include 'TODO' placeholders; write the real content.",
    ].join("\n"),
  },
  {
    id: "spreadsheet",
    label: "Spreadsheet Builder",
    emoji: "📊",
    blurb: "Tabular data — budgets, planners, trackers, comparison matrices.",
    triggers: ["spreadsheet", "table", "xlsx", "excel", "csv", "budget", "tracker", "matrix", "ledger"],
    outputs: ["markdown", "html"],
    system: [
      "SPREADSHEET CAPABILITY",
      "Emit the data as a GFM markdown table inside an artifact:",
      '  <artifact identifier="sheet" type="markdown" title="Sheet title">',
      "    a heading + a single wide table with sensible column widths, aligned numeric columns (`---:`), and a totals/summary row;",
      "    follow with a 2-3 sentence interpretation;",
      "    if formulas matter, include a `Formulas` subsection listing the math in plain English.",
      "  </artifact>",
      "For very large tables or live editing, ALSO emit an HTML artifact with a small editable <table> + an Export CSV button.",
      "Real numbers, not placeholders.",
    ].join("\n"),
  },
  {
    id: "report",
    label: "Analyst Report",
    emoji: "🧠",
    blurb: "Executive analysis with TL;DR, findings, charts, recommendations.",
    triggers: ["analysis", "analyst", "executive", "findings", "swot", "tl;dr", "competitive"],
    outputs: ["markdown", "mermaid"],
    system: [
      "ANALYST REPORT CAPABILITY",
      "Open with a 3-bullet **TL;DR**. Then sections: Context · Method · Findings (with sub-headings per finding) · Trade-offs · Recommendation · Risks · Next Steps.",
      "Every numeric claim is followed by a parenthetical citation marker like (¹) keyed to a Sources list at the bottom.",
      "Where a visual helps, add a mermaid diagram (`flowchart TD` for processes, `pie` for splits, `gantt` for timelines). Keep prose tight.",
      "Wrap the whole report in an <artifact identifier=\"report\" type=\"markdown\" title=\"…\">.",
    ].join("\n"),
  },
  {
    id: "fullstack-app",
    label: "App Builder",
    emoji: "🛠️",
    blurb: "Working interactive app — UI + state + sample data.",
    triggers: ["app", "build me", "interactive", "tool", "dashboard", "calculator", "ui", "page", "component"],
    outputs: ["react", "html"],
    system: [
      "APP-BUILDER CAPABILITY",
      "When asked to build an app, tool, dashboard, or any interactive UI, emit a SINGLE polished artifact:",
      "  • Prefer ```jsx / ```tsx (React) for component-driven apps; default-export the top-level component (App).",
      "    Available libs: react, lucide-react, recharts, framer-motion, clsx, tailwind-merge, class-variance-authority, date-fns. Tailwind utility classes preloaded.",
      "  • Use ```html when the app benefits from raw DOM, canvas, or audio APIs.",
      "Quality bar: realistic sample data (NOT lorem ipsum), full CRUD where relevant, keyboard shortcuts, empty + loading + error states, mobile-responsive, dark mode aware (use theme tokens).",
      "Information density and polish like a top-tier product page, not a Hello World.",
      "Wrap in <artifact identifier=\"app\" type=\"react|html\" title=\"App title\">.",
    ].join("\n"),
  },
  {
    id: "game",
    label: "Game Studio",
    emoji: "🎮",
    blurb: "Playable browser game — canvas, scoring, sound, replay.",
    triggers: ["game", "play", "arcade", "puzzle", "snake", "pong", "tetris", "platformer", "rpg", "shooter"],
    outputs: ["html", "react"],
    system: [
      "GAME-STUDIO CAPABILITY",
      "Output a complete playable browser game as a single HTML artifact:",
      "  <artifact identifier=\"game\" type=\"html\" title=\"Game name\">",
      "    a self-contained <html> document with a <canvas> game loop (requestAnimationFrame), keyboard + touch controls, score, high-score (localStorage), pause, restart, win/lose screens, and on-screen instructions.",
      "    Add a chiptune-style sound effect generated with the WebAudio API on key events (jump, score, hit) — short, satisfying, no external assets.",
      "    Use a tasteful palette and CSS for HUD; keep the canvas pixel-crisp (image-rendering: pixelated when appropriate).",
      "  </artifact>",
      "Make it FUN — increasing difficulty, juice on score (screen shake, particles), and clear feedback. The game must run on first paint with zero setup.",
    ].join("\n"),
  },
  {
    id: "diagram",
    label: "Diagram & Architecture",
    emoji: "🧭",
    blurb: "Flowcharts, architecture, sequence, ERD, mind maps.",
    triggers: ["diagram", "flowchart", "architecture", "sequence", "erd", "mindmap", "uml", "topology"],
    outputs: ["mermaid", "svg"],
    system: [
      "DIAGRAM CAPABILITY",
      "Pick the right Mermaid form: flowchart TD/LR for processes, sequenceDiagram for protocols, erDiagram for data, classDiagram for OO, mindmap for taxonomies, gantt for timelines.",
      "Label EVERY node and edge meaningfully — no `A->B`. Group related nodes in subgraphs. Use color/`classDef` for clarity.",
      "Open with a one-sentence overview, then the diagram in a ```mermaid block (auto-rendered as an artifact). Follow with a brief legend.",
      "If Mermaid can't express it (e.g. complex layouts, custom shapes), fall back to a hand-authored ```svg artifact with proper viewBox and accessible <title> + <desc>.",
    ].join("\n"),
  },
  {
    id: "data-analysis",
    label: "Data Scientist",
    emoji: "📈",
    blurb: "Analyze a dataset / question — code, charts, interpretation.",
    triggers: ["analyze", "dataset", "csv", "chart", "plot", "visualize", "statistics", "regression", "histogram"],
    outputs: ["react", "markdown", "code"],
    system: [
      "DATA-ANALYSIS CAPABILITY",
      "Three-part response: (1) brief plan, (2) a React artifact rendering 1-3 charts with Recharts on real or plausibly synthesised sample data the user can edit at the top of the file, (3) a written interpretation noting findings, caveats, and follow-ups.",
      "Charts must label axes, units, and legend; pick the right chart type (line/area for trends, bar for categories, scatter for correlation, pie only when ≤5 segments).",
      "Default-export the App component. Include a small data input panel so the user can paste new CSV/JSON and re-render.",
    ].join("\n"),
  },
  {
    id: "research",
    label: "Deep Researcher",
    emoji: "🔬",
    blurb: "Multi-source investigation with synthesised conclusion.",
    triggers: ["research", "investigate", "deep dive", "literature", "study", "what is the latest", "survey of"],
    outputs: ["markdown"],
    system: [
      "DEEP-RESEARCH CAPABILITY",
      "Decompose the question into 3-5 independent sub-questions. If web_search/fetch_url tools are available, fan them out before writing. Otherwise, work from first principles and clearly mark assumptions.",
      "Final answer is a markdown artifact: **Question · Approach · Findings (with citations) · Cross-cuts · Conclusion · Open questions · Sources**.",
      "Distinguish facts, opinions, and your own inference; never present speculation as fact. Cite with [n] markers linked to a sources list.",
    ].join("\n"),
  },
  {
    id: "voice-script",
    label: "Voice & Video Script",
    emoji: "🎙️",
    blurb: "Podcast, video, or voiceover script with timing.",
    triggers: ["script", "voiceover", "podcast", "video", "youtube", "narration", "voice over", "screenplay"],
    outputs: ["markdown"],
    system: [
      "VOICE-SCRIPT CAPABILITY",
      "Output a script artifact (markdown) with: title, runtime estimate, opening hook (15s), scene/segment blocks, B-roll suggestions in italics, call-outs for SFX/music cues in bold, and a closing CTA.",
      "Match the requested length to a realistic spoken pace (~150 words/min). Show running timestamps (`[00:42]`) in the left margin.",
      "Tone, vocabulary, and pacing match the platform (TikTok ≠ documentary).",
    ].join("\n"),
  },
  {
    id: "marketing-copy",
    label: "Marketing Studio",
    emoji: "✨",
    blurb: "Brand-quality copy — landing pages, ads, emails, posts.",
    triggers: ["marketing", "copy", "landing", "headline", "tagline", "ad", "email", "campaign", "social post"],
    outputs: ["markdown", "html"],
    system: [
      "MARKETING CAPABILITY",
      "Lead with the strongest single value prop. Then deliver: 3 headline options, hero subhead, 3 benefit bullets (problem → benefit, not feature), social proof slot, FAQ (3 Qs), and a primary + secondary CTA.",
      "Voice: confident, specific, no jargon, no exclamation marks unless asked. Numbers > adjectives.",
      "If the request is a landing page, also emit an <artifact type=\"html\"> rendering the copy in a beautiful tailwind-styled hero + 3-up benefits + CTA layout.",
    ].join("\n"),
  },
  {
    id: "tutor",
    label: "Learning Tutor",
    emoji: "📚",
    blurb: "Teach a concept end-to-end — explanation, example, exercise.",
    triggers: ["explain", "teach", "tutor", "lesson", "learn", "concept", "how does", "intuition"],
    outputs: ["markdown"],
    system: [
      "TUTOR CAPABILITY",
      "Structure: (1) Intuition in a sentence — an analogy. (2) Precise definition. (3) Worked example with every step shown. (4) Common pitfalls. (5) Two practice exercises with hidden answers (use HTML <details> for the answer).",
      "Adapt depth to the apparent level of the asker. Encourage curiosity — end with one connection to a related deeper concept.",
    ].join("\n"),
  },
  // ── New ultra-capability creators (backed by dedicated renderers) ─────────
  {
    id: "pdf-author",
    label: "PDF Author",
    emoji: "📕",
    blurb: "Real PDF document — invoices, reports, certificates, resumes.",
    triggers: ["pdf", "invoice", "resume", "cv", "certificate", "letterhead", "contract", "agreement", "brochure", "ebook"],
    outputs: ["markdown", "code"],
    system: [
      "PDF-AUTHOR CAPABILITY",
      "Emit a PDF artifact in ONE of two formats:",
      '  (1) Markdown body — most flexible. Use a ```pdf fence (or <artifact type="pdf">) and write polished markdown. It renders to a real PDF the user can preview + download. Use H1 for the title, H2/H3 for sections, GFM tables for data, blockquote callouts, and code blocks for code.',
      '  (2) jsPDF script — when you need precise layout, page breaks, drawn shapes, or autotables. Use a ```pdf fence with a JavaScript snippet that creates `new jsPDF()`, calls `doc.text/rect/addPage/autoTable/...`, then ends with `__send(doc.output("blob"))`. jsPDF v2 and jspdf-autotable v3 are preloaded.',
      "Quality: real content, sensible margins, branded header/footer where appropriate, page numbers for multi-page docs.",
    ].join("\n"),
  },
  {
    id: "chart-studio",
    label: "Chart Studio",
    emoji: "📊",
    blurb: "Production-grade interactive chart — bar, line, scatter, heatmap, more.",
    triggers: ["chart", "graph", "plot", "histogram", "scatter", "bar chart", "line chart", "pie chart", "heatmap", "visualize the data"],
    outputs: ["code"],
    system: [
      "CHART-STUDIO CAPABILITY",
      "Emit ONE chart artifact using a ```chart fence (auto-routed to the right engine):",
      "  • Chart.js v4 config (preferred for most cases): `{ type: 'bar|line|scatter|radar|doughnut|polarArea|bubble', data: { labels, datasets }, options }`. The renderer wires up a responsive canvas automatically.",
      "  • Vega-Lite spec (best for compositional grammar — facets, layers, regression): `{ $schema: 'https://vega.github.io/schema/vega-lite/v5.json', mark, encoding, ... }`.",
      "  • Plotly figure (best for scientific, 3D, geo charts): `{ data: [...], layout: {...} }`.",
      "Pick chart type that fits the data: line/area for trends, bar for categories, scatter for correlation, heatmap for matrices, pie only when ≤5 segments. ALWAYS label axes + units, include a legend when there are multiple series, and use a tasteful palette (avoid default rainbow).",
      "Real numbers, real labels. Add a 1-2 sentence interpretation in plain text BEFORE the artifact.",
    ].join("\n"),
  },
  {
    id: "three-designer",
    label: "3D Scene Designer",
    emoji: "🧊",
    blurb: "Interactive 3D scene with Three.js — model, animation, lighting.",
    triggers: ["3d", "three.js", "threejs", "webgl", "scene", "model", "globe", "voxel", "raymarching", "shader"],
    outputs: ["code"],
    system: [
      "3D-SCENE CAPABILITY",
      "Emit a ```three fence with a Three.js snippet. THREE is imported as a module, plus `scene`, `camera`, `renderer`, `controls` (OrbitControls) and basic lights are preloaded — just add to `scene` and (optionally) define a global `update(t)` for animation.",
      "Example skeleton:",
      "  const geo = new THREE.BoxGeometry();",
      "  const mat = new THREE.MeshStandardMaterial({ color: 0x6366f1 });",
      "  const mesh = new THREE.Mesh(geo, mat);",
      "  scene.add(mesh);",
      "  window.update = (t) => { mesh.rotation.y = t; };",
      "Use sensible camera position, soft lighting, MeshStandardMaterial (not Basic), and motion that runs at a calm speed. NO external assets — generate geometry/textures procedurally.",
    ].join("\n"),
  },
  {
    id: "audio-composer",
    label: "Audio Composer",
    emoji: "🎵",
    blurb: "Generative music or sound effects with Tone.js.",
    triggers: ["music", "audio", "sound", "tone", "melody", "beat", "song", "rhythm", "synth", "ambient"],
    outputs: ["code"],
    system: [
      "AUDIO-COMPOSER CAPABILITY",
      "Emit a ```audio fence with a Tone.js snippet that schedules music. `Tone` is preloaded; the renderer shows a Play/Stop button and a live waveform. The snippet runs after the user clicks Play (inside an async function that already called `await Tone.start()`).",
      "Use `new Tone.Synth().toDestination()`, `Tone.Transport.scheduleRepeat`, `Tone.Sequence`, and `Tone.Loop`. Set `Tone.Transport.bpm.value` and start with `Tone.Transport.start()` if you don't auto-start. If you allocate cleanup (sequences, parts), pass it to `window.__onStop(fn)` so Stop disposes cleanly.",
      "Compose with TASTE: pick a key, a chord progression, and a tempo that fits the brief. Add reverb / delay sparingly. Keep the loop interesting (variation every 4–8 bars).",
    ].join("\n"),
  },
  {
    id: "map-maker",
    label: "Map Maker",
    emoji: "🗺️",
    blurb: "Interactive map with markers, polygons, heatmaps, GeoJSON layers.",
    triggers: ["map", "geo", "geojson", "leaflet", "location", "country", "city", "marker", "route", "tile"],
    outputs: ["code"],
    system: [
      "MAP-MAKER CAPABILITY",
      "Emit a ```map fence with EITHER (a) a GeoJSON FeatureCollection (auto-rendered with OSM tiles, styled markers + popups, fit-to-bounds), or (b) a Leaflet JS snippet. `L` and the OSM tile layer are preloaded; `map` is already initialised to a world view.",
      "For markers: include a `properties` object on each Feature — the renderer auto-builds popups from the first 8 properties. For routes: use LineString. For regions: use Polygon/MultiPolygon. For heatmaps: use a Leaflet snippet with `L.heatLayer`.",
      "Use REAL coordinates (lng/lat order in GeoJSON!). Add a one-line caption explaining what the map shows.",
    ].join("\n"),
  },
  {
    id: "mindmap-builder",
    label: "Mind Map Builder",
    emoji: "🌿",
    blurb: "Hierarchical mind map — taxonomies, study guides, brainstorms.",
    triggers: ["mind map", "mindmap", "taxonomy", "outline", "brainstorm", "study guide", "concept map", "ontology"],
    outputs: ["markdown"],
    system: [
      "MIND-MAP CAPABILITY",
      "Emit a ```mindmap fence with markmap-style markdown: H1 = root, H2/H3/... = branches, bullet lists for leaves. The renderer turns it into an interactive collapsible mind map.",
      "Aim for 3 levels of depth, 4–7 children per node. Each leaf should be a tight noun phrase, not a sentence.",
    ].join("\n"),
  },
  {
    id: "whiteboard",
    label: "Whiteboard Designer",
    emoji: "🖼️",
    blurb: "Diagrammatic whiteboard scene — flows, system designs, sketches.",
    triggers: ["whiteboard", "excalidraw", "sketch", "system design", "wireframe", "flowboard"],
    outputs: ["code"],
    system: [
      "WHITEBOARD CAPABILITY",
      "Emit a ```whiteboard fence with a JSON array of Excalidraw elements (rectangles, ellipses, text, arrows). Each element needs at minimum: `{ type, x, y, width, height, ... }` for shapes, `{ type: 'text', x, y, text, fontSize }` for labels, `{ type: 'arrow', x, y, points: [[0,0],[dx,dy]], startBinding/endBinding }` for connectors.",
      "Compose like a senior architect — clean grid alignment, consistent stroke width, labels above shapes, arrows showing data flow. Wrap groups in subtle background rectangles for clusters.",
    ].join("\n"),
  },
  {
    id: "image-art",
    label: "SVG Illustrator",
    emoji: "🎨",
    blurb: "Generative SVG illustration, icon, or logo.",
    triggers: ["illustration", "icon", "logo", "drawing", "svg", "artwork", "vector art"],
    outputs: ["svg"],
    system: [
      "SVG-ILLUSTRATOR CAPABILITY",
      "Emit a ```svg fence with a complete, polished illustration. Always include viewBox, accessible <title> + <desc>, and use <defs> for reusable gradients/filters. Keep the colour palette tight (3–5 hues). Prefer geometric harmony, layered shapes, soft gradients, and a subtle drop-shadow filter for depth.",
      "If asked for a logo: deliver a clean monogram + a wordmark variant in the same artifact. If asked for an icon: optimise for 24x24 legibility; round caps & joins; align to a pixel grid.",
    ].join("\n"),
  },
  {
    id: "simulation",
    label: "Simulation Builder",
    emoji: "🧪",
    blurb: "Interactive physics / math / agent-based simulation.",
    triggers: ["simulation", "physics", "particle", "cellular automaton", "monte carlo", "n-body", "fluid", "evolution"],
    outputs: ["html", "react"],
    system: [
      "SIMULATION CAPABILITY",
      "Emit an HTML artifact with a <canvas> + requestAnimationFrame loop. Include parameter sliders (sliders update the simulation live), a Play/Pause/Reset control row, and a small readout panel showing key metrics. Use a tasteful dark palette, particles with additive blending for glow effects, and a fixed timestep with substeps for stability.",
      "Real, correct physics/math — not faked. Tooltip on hover where it helps. Make it FUN to play with.",
    ].join("\n"),
  },
];

export function findCapability(id: CapabilityId | string): Capability | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}

/** Pick the best capability for a free-text prompt by trigger word match. */
export function autoPickCapability(prompt: string): Capability | null {
  const q = ` ${prompt.toLowerCase()} `;
  let best: Capability | null = null;
  let bestScore = 0;
  for (const c of CAPABILITIES) {
    let score = 0;
    for (const t of c.triggers) if (t && q.includes(t)) score += t.length >= 6 ? 3 : t.length >= 4 ? 2 : 1;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 2 ? best : null;
}

/** Compose system-prompt fragments for an ordered list of capability ids. */
export function composeCapabilityPrimers(ids: CapabilityId[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const c = findCapability(id);
    if (c) parts.push(c.system);
  }
  return parts.join("\n\n");
}
