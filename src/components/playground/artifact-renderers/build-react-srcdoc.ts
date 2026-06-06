// Builds a fully self-contained HTML document that renders a React/JSX/TSX artifact
// inside a sandboxed iframe — the same architecture Claude Artifacts uses:
//   • <script type="importmap"> mapping every imported package to the esm.sh CDN
//   • Babel Standalone for in-browser JSX/TSX transpilation
//   • Tailwind Play CDN for styling
//   • a console/error bridge that postMessages back to the parent
//
// The result is a string suitable for an <iframe srcDoc>. It is also reused verbatim
// for "Open in new tab" / "Download standalone .html".

import { CONSOLE_BRIDGE } from "./console-bridge";
import { stripWrappingCodeFence } from "@/lib/artifacts";

const REACT_VERSION = "18.3.1";
const ESM = "https://esm.sh";

// Pin versions for libraries the host app already ships, so previews match the app.
const PINNED: Record<string, string> = {
  "lucide-react": "0.469.0",
  recharts: "2.15.0",
  "framer-motion": "11.15.0",
};

// ─── react-icons prefix → sub-package mapping ────────────────────────────────
// Models frequently import icon names like `FiDelete` from `lucide-react`
// when they actually belong to `react-icons/fi`. We auto-correct these.
const REACT_ICONS_PREFIX: Array<[prefix: string, pkg: string]> = [
  // Longest prefixes first to avoid partial matches (e.g. "Hi2" before "Hi").
  ["Tfi", "react-icons/tfi"],
  ["Hi2", "react-icons/hi2"],
  ["Io5", "react-icons/io5"],
  ["Vsc", "react-icons/vsc"],
  ["Fa6", "react-icons/fa6"],
  ["Fa",  "react-icons/fa"],
  ["Fi",  "react-icons/fi"],
  ["Md",  "react-icons/md"],
  ["Ai",  "react-icons/ai"],
  ["Bi",  "react-icons/bi"],
  ["Bs",  "react-icons/bs"],
  ["Cg",  "react-icons/cg"],
  ["Di",  "react-icons/di"],
  ["Fc",  "react-icons/fc"],
  ["Gi",  "react-icons/gi"],
  ["Go",  "react-icons/go"],
  ["Gr",  "react-icons/gr"],
  ["Hi",  "react-icons/hi"],
  ["Im",  "react-icons/im"],
  ["Io",  "react-icons/io"],
  ["Ri",  "react-icons/ri"],
  ["Si",  "react-icons/si"],
  ["Sl",  "react-icons/sl"],
  ["Tb",  "react-icons/tb"],
  ["Ti",  "react-icons/ti"],
  ["Wi",  "react-icons/wi"],
  ["Pi",  "react-icons/pi"],
  ["Rx",  "react-icons/rx"],
  ["Lu",  "react-icons/lu"],
];

/** Detect which react-icons sub-package an icon name belongs to, or null. */
function iconPackageFor(ident: string): string | null {
  for (const [prefix, pkg] of REACT_ICONS_PREFIX) {
    if (ident.startsWith(prefix) && ident.length > prefix.length && ident[prefix.length] === ident[prefix.length].toUpperCase()) {
      return pkg;
    }
  }
  return null;
}

/**
 * Fix misrouted icon imports. Models commonly import react-icons names (e.g. FiDelete,
 * MdHome) from lucide-react. This function detects those names and rewrites the import
 * to the correct react-icons/fi, react-icons/md, etc. sub-package, leaving genuine
 * lucide-react names alone. Also handles the reverse: `Lu*` names imported from
 * `react-icons/lu` are valid, so those are left untouched.
 *
 * Example input:  import { X, FiDelete, MdHome } from 'lucide-react'
 * Example output: import { X } from 'lucide-react'
 *                 import { FiDelete } from 'react-icons/fi'
 *                 import { MdHome } from 'react-icons/md'
 */
export function fixMisroutedIconImports(source: string): string {
  // Match value imports (not `import type`) from lucide-react.
  return source.replace(
    /\bimport\s+(?!type\s)(\{[^}]+\})\s+from\s+(['"]lucide-react['"])/g,
    (match, namedClause: string, quote: string) => {
      const names = namedClause
        .replace(/[{}]/g, "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

      const lucideNames: string[] = [];
      const byPkg: Record<string, string[]> = {};

      for (const name of names) {
        const ident = name.split(/\s+as\s+/)[0].trim();
        const pkg = iconPackageFor(ident);
        if (pkg) {
          byPkg[pkg] = byPkg[pkg] ?? [];
          byPkg[pkg].push(name);
        } else {
          lucideNames.push(name);
        }
      }

      const lines: string[] = [];
      if (lucideNames.length) lines.push(`import { ${lucideNames.join(", ")} } from 'lucide-react'`);
      for (const [pkg, ns] of Object.entries(byPkg)) {
        lines.push(`import { ${ns.join(", ")} } from '${pkg}'`);
      }
      return lines.join(";\n");
    },
  );
}

// ─── Core imports & importmap ─────────────────────────────────────────────────

// Core React entries. Everything non-core is loaded with ?external=react,react-dom so
// the whole sandbox shares ONE React instance (otherwise hooks throw "invalid hook call").
function coreImports(): Record<string, string> {
  return {
    react: `${ESM}/react@${REACT_VERSION}`,
    "react/jsx-runtime": `${ESM}/react@${REACT_VERSION}/jsx-runtime`,
    "react/jsx-dev-runtime": `${ESM}/react@${REACT_VERSION}/jsx-dev-runtime`,
    "react-dom": `${ESM}/react-dom@${REACT_VERSION}?external=react`,
    "react-dom/client": `${ESM}/react-dom@${REACT_VERSION}/client?external=react`,
  };
}

/** Reduce an import specifier to its package root: `date-fns/format` → `date-fns`, `@scope/p/x` → `@scope/p`. */
function packageRoot(spec: string): string {
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/");
  return spec.split("/")[0];
}

/** Collect bare package specifiers imported by the source (static import/export-from + dynamic import). */
export function scanImports(source: string): string[] {
  const specs = new Set<string>();
  const add = (s: string | undefined) => {
    if (!s) return;
    if (s.startsWith(".") || s.startsWith("/") || s.startsWith("@/") || /^https?:/.test(s)) return;
    specs.add(s);
  };
  let m: RegExpExecArray | null;
  const fromRe = /\bfrom\s*["']([^"']+)["']/g;
  while ((m = fromRe.exec(source))) add(m[1]);
  const sideRe = /\bimport\s*["']([^"']+)["']/g;
  while ((m = sideRe.exec(source))) add(m[1]);
  const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = dynRe.exec(source))) add(m[1]);
  return [...specs];
}

/** Build the importmap (core + auto esm.sh for every other imported package). */
export function buildImportMap(source: string): Record<string, string> {
  const imports = coreImports();
  for (const spec of scanImports(source)) {
    const root = packageRoot(spec);
    if (root === "react" || root === "react-dom") continue;

    // Subpath imports (e.g. `react-icons/fi`) need an EXPLICIT importmap entry —
    // the prefix `react-icons/` trick can't carry the ?external=react query param.
    if (spec !== root) {
      if (!imports[spec]) {
        const ver = PINNED[root] ? `@${PINNED[root]}` : "";
        imports[spec] = `${ESM}/${spec}${ver}?external=react`;
      }
      // Also ensure the root entry exists (some packages import both root + subpath).
      if (!imports[root]) {
        const ver = PINNED[root] ? `@${PINNED[root]}` : "";
        imports[root] = `${ESM}/${root}${ver}?external=react,react-dom`;
      }
      continue;
    }

    if (imports[root]) continue;
    const ver = PINNED[root] ? `@${PINNED[root]}` : "";
    imports[root] = `${ESM}/${root}${ver}?external=react,react-dom`;
    imports[`${root}/`] = `${ESM}/${root}${ver}/`;
  }
  return imports;
}

// ─── Default-export transform ─────────────────────────────────────────────────

/**
 * Rewrite the artifact's `export default` into a stable local handle so the bootstrap
 * can mount it. Returns the rewritten source and the handle identifier (or null).
 */
export function transformDefaultExport(source: string): { code: string; handle: string | null } {
  let m = source.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
  if (m) return { code: source.replace(/export\s+default\s+function\s+/, "function "), handle: m[1] };

  m = source.match(/export\s+default\s+class\s+([A-Za-z0-9_$]+)/);
  if (m) return { code: source.replace(/export\s+default\s+class\s+/, "class "), handle: m[1] };

  m = source.match(/export\s+default\s+([A-Za-z0-9_$]+)\s*;?\s*$/m);
  if (m) return { code: source.replace(/export\s+default\s+[A-Za-z0-9_$]+\s*;?\s*$/m, ""), handle: m[1] };

  if (/export\s+default\s+/.test(source)) {
    return { code: source.replace(/export\s+default\s+/, "const __ArtifactDefault = "), handle: "__ArtifactDefault" };
  }
  return { code: source, handle: null };
}

const FALLBACK_COMPONENT =
  `function __ArtifactDefault(){ return __React.createElement("div",{style:{padding:"24px",fontFamily:"system-ui,sans-serif",color:"#b45309"}}, "No default export found. End your component with: export default App"); }`;

/** Compose the final ES module: rewritten user code + mount bootstrap with an error boundary. */
function composeModule(source: string): string {
  const { code, handle } = transformDefaultExport(source);
  const resolvedHandle = handle ?? "__ArtifactDefault";
  const fallback = handle ? "" : `\n${FALLBACK_COMPONENT}\n`;

  const bootstrap = `
import __React from "react";
import { createRoot as __createRoot } from "react-dom/client";
function __ArtifactErrorView(props){
  return __React.createElement("pre", { style: { whiteSpace:"pre-wrap", wordBreak:"break-word", color:"#dc2626", padding:"16px", fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace", fontSize:"12px", lineHeight:1.5 } }, String(props.error && (props.error.stack || props.error.message) || props.error));
}
class __ArtifactBoundary extends __React.Component {
  constructor(p){ super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error){ try { parent.postMessage({ __llmatlas_console:true, level:"error", text:String(error && (error.stack||error.message)) }, "*"); } catch(e){} }
  render(){ return this.state.error ? __React.createElement(__ArtifactErrorView, { error: this.state.error }) : this.props.children; }
}
const __rootEl = document.getElementById("root");
__createRoot(__rootEl).render(__React.createElement(__ArtifactBoundary, null, __React.createElement(${resolvedHandle})));
`;
  return `${code}\n${fallback}${bootstrap}`;
}

// ─── Error enrichment ─────────────────────────────────────────────────────────

/**
 * Parse common ES module resolution errors and enrich them with actionable hints.
 * For example: "does not provide an export named 'FiDelete'" from lucide-react
 * is identified as a misrouted react-icons import and the correct package is suggested.
 */
function enrichErrorMessage(rawError: string): string {
  // Pattern: "The requested module 'X' does not provide an export named 'Y'"
  const namedExport = /The requested module ['"]([^'"]+)['"]\s+does not provide an export named ['"]([^'"]+)['"]/i.exec(rawError);
  if (namedExport) {
    const [, fromPkg, exportName] = namedExport;
    const suggestedPkg = iconPackageFor(exportName);
    if (suggestedPkg) {
      return (
        `${rawError}\n\n` +
        `💡 Hint: "${exportName}" is a ${suggestedPkg} icon, not a ${fromPkg} icon.\n` +
        `Fix the import:\n  import { ${exportName} } from '${suggestedPkg}'`
      );
    }
    return (
      `${rawError}\n\n` +
      `💡 Hint: "${exportName}" is not exported by "${fromPkg}".\n` +
      `Check the package docs or ask the model to fix the import.`
    );
  }
  return rawError;
}

// ─── HTML fallback & srcdoc assembly ─────────────────────────────────────────

const READY_PING = `<script>window.addEventListener("load",function(){try{parent.postMessage({__llmatlas_artifact_ready:true},"*");}catch(e){}});<\/script>`;

/**
 * Fallback for content that is actually an HTML document (a misrouted or legacy
 * artifact stored as kind "react"). Render it as HTML — with the console bridge and
 * Tailwind injected — instead of feeding `<!DOCTYPE html>` to Babel (which throws).
 */
function buildHtmlFallbackDoc(html: string): string {
  const head = CONSOLE_BRIDGE + READY_PING + (/tailwindcss/i.test(html) ? "" : `<script src="https://cdn.tailwindcss.com"></script>`);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + head);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + head + "</head>");
  return `<!doctype html><html><head><meta charset="utf-8"/>${head}</head><body>${html}</body></html>`;
}

/** Build the complete iframe document for a React artifact. */
export function buildReactSrcdoc(rawSource: string): string {
  // 1. Strip wrapping code fence (model may nest ```jsx inside <artifact>).
  const stripped = stripWrappingCodeFence(rawSource).content;

  // 2. If content is actually an HTML document, render it as HTML (not Babel).
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(stripped)) {
    return buildHtmlFallbackDoc(stripped);
  }

  // 3. Fix misrouted icon imports (Fi*, Md*, Bi*, … from lucide-react → react-icons/*).
  const source = fixMisroutedIconImports(stripped);

  // 4. Build importmap from the (now-corrected) source.
  const importMap = JSON.stringify({ imports: buildImportMap(source) });
  const moduleSource = composeModule(source).replace(/<\/script>/gi, "<\\/script>");

  // 5. Serialise the enrichErrorMessage helper for inline use in the srcdoc.
  const enrichFn = enrichErrorMessage.toString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${CONSOLE_BRIDGE}
<script src="https://cdn.tailwindcss.com"></script>
<script type="importmap">${importMap}</script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<style>html,body{margin:0;height:100%;background:#fff}#root{min-height:100%}</style>
</head>
<body>
<div id="root"></div>
<script type="text/plain" id="artifact-src">${moduleSource}</script>
<script type="module">
(async () => {
  const root = document.getElementById("root");
  const esc = (s) => String(s).replace(/[&<>]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  ${enrichFn}
  function showError(e){
    const raw = (e && (e.stack || e.message)) || String(e);
    const text = enrichErrorMessage(raw);
    root.innerHTML = '<pre style="white-space:pre-wrap;word-break:break-word;color:#dc2626;padding:16px;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.5">' + esc(text) + '</pre>';
    try { parent.postMessage({ __llmatlas_console:true, level:"error", text },"*"); } catch(_){}
  }
  try {
    if (!window.Babel) throw new Error("Babel failed to load from the CDN. Check your network connection.");
    const src = document.getElementById("artifact-src").textContent;
    const out = window.Babel.transform(src, {
      presets: [["react",{runtime:"automatic"}],["typescript",{isTSX:true,allExtensions:true,onlyRemoveTypeImports:true}]],
      sourceType: "module",
      filename: "artifact.tsx",
    }).code;
    const url = URL.createObjectURL(new Blob([out],{type:"text/javascript"}));
    await import(url);
  } catch(e){
    showError(e);
  } finally {
    try { parent.postMessage({__llmatlas_artifact_ready:true},"*"); } catch(_){}
  }
})();
</script>
</body>
</html>`;
}
