"use client";

// Mind-map renderer — accepts markmap-style markdown (a nested heading + bullet
// list outline) and renders it as an interactive mind map via markmap.

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";

interface Props {
  content: string;
  reloadKey?: number;
}

function buildDoc(md: string): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body{margin:0;height:100%;background:#fff}#m{width:100%;height:100%}</style>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.4"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.18.4/dist/browser/index.iife.min.js"></script>
</head><body>
<svg id="m"></svg>
<script>
(function(){
  try {
    const { Transformer } = markmap;
    const { Markmap } = window.markmap;
    const t = new Transformer();
    const { root } = t.transform(${JSON.stringify(md)});
    Markmap.create('#m', undefined, root);
  } catch(e){
    document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e && (e.stack||e.message))+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script></body></html>`;
}

export function MindmapRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => buildDoc(content), [content]);
  return (
    <iframe
      key={reloadKey}
      title="Mindmap artifact"
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full h-full border-0 bg-white"
    />
  );
}
