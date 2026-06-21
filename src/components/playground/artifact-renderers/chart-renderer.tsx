"use client";

// Chart renderer — accepts either a Chart.js config (preferred) or a Vega-Lite
// spec inside an artifact and renders it in a sandboxed iframe.
//
// Input formats (auto-detected from JSON shape):
//   • Chart.js v4 config:   { type, data, options? }
//   • Vega-Lite v5 spec:    { $schema:".../vega-lite/...", mark, encoding, ... }
//   • Plotly figure:        { data: [...], layout: {...} }
//
// The iframe is sandboxed (no-same-origin) and forwards console + errors
// through the existing CONSOLE_BRIDGE so the panel can show them.

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";

interface Props {
  content: string;
  reloadKey?: number;
}

type Detected = "chartjs" | "vega-lite" | "vega" | "plotly" | "unknown";

function detectSpec(raw: unknown): Detected {
  if (!raw || typeof raw !== "object") return "unknown";
  const o = raw as Record<string, unknown>;
  if (typeof o.$schema === "string" && /vega-lite/i.test(o.$schema)) return "vega-lite";
  if (typeof o.$schema === "string" && /vega/i.test(o.$schema)) return "vega";
  if (Array.isArray((o as { data?: unknown }).data) && typeof o.layout === "object") return "plotly";
  if (typeof o.type === "string" && typeof o.data === "object") return "chartjs";
  if (typeof o.mark !== "undefined" && typeof o.encoding === "object") return "vega-lite";
  return "unknown";
}

function buildChartJsDoc(spec: string): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body{margin:0;height:100%;background:#fff;font-family:system-ui,sans-serif}#wrap{padding:16px;height:100%;box-sizing:border-box}</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
</head><body><div id="wrap"><canvas id="c"></canvas></div>
<script>
(function(){
  try {
    const spec = ${spec};
    const ctx = document.getElementById('c').getContext('2d');
    new Chart(ctx, spec);
  } catch(e){
    document.body.innerHTML = '<pre style="white-space:pre-wrap;color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e && (e.stack||e.message))+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script></body></html>`;
}

function buildVegaDoc(spec: string, lite: boolean): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body{margin:0;height:100%;background:#fff;font-family:system-ui,sans-serif}#wrap{padding:16px;height:100%;box-sizing:border-box}</style>
<script src="https://cdn.jsdelivr.net/npm/vega@5.30.0"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-lite@5.21.0"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-embed@6.26.0"></script>
</head><body><div id="wrap"><div id="v"></div></div>
<script>
(function(){
  try {
    const spec = ${spec};
    vegaEmbed('#v', spec, { actions: { source: false, compiled: false, editor: false }, renderer:'svg' });
  } catch(e){
    document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e)+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script></body></html>`;
}

function buildPlotlyDoc(spec: string): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body{margin:0;height:100%;background:#fff;font-family:system-ui,sans-serif}#p{padding:16px;height:100%;box-sizing:border-box}</style>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
</head><body><div id="p"></div>
<script>
(function(){
  try {
    const fig = ${spec};
    Plotly.newPlot('p', fig.data || [], fig.layout || {}, { responsive: true, displaylogo: false });
  } catch(e){
    document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e)+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script></body></html>`;
}

export function ChartRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => {
    const trimmed = content.trim();
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch {
      return `<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">Invalid chart JSON.\n\n${trimmed.slice(0, 400)}</pre>`;
    }
    const kind = detectSpec(parsed);
    const json = JSON.stringify(parsed);
    if (kind === "chartjs") return buildChartJsDoc(json);
    if (kind === "vega-lite") return buildVegaDoc(json, true);
    if (kind === "vega") return buildVegaDoc(json, false);
    if (kind === "plotly") return buildPlotlyDoc(json);
    return `<pre style="color:#b45309;padding:16px;font-family:ui-monospace">Could not detect chart kind.\nExpected a Chart.js config, Vega-Lite spec, or Plotly figure.</pre>`;
  }, [content]);

  return (
    <iframe
      key={reloadKey}
      title="Chart artifact"
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-popups"
      className="w-full h-full border-0 bg-white"
    />
  );
}
