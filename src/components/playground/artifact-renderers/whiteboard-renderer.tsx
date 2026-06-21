"use client";

// Whiteboard renderer — embeds an Excalidraw scene built from the model's JSON.
// The model emits an array of Excalidraw elements (e.g. rectangles, arrows,
// text, ellipses). We use the official excalidraw-share build via iframe.

import { useMemo } from "react";
import { CONSOLE_BRIDGE } from "./console-bridge";

interface Props {
  content: string;
  reloadKey?: number;
}

function buildDoc(json: string): string {
  return `<!doctype html><html><head>
${CONSOLE_BRIDGE}
<style>html,body,#root{margin:0;height:100%;width:100%;background:#fff;font-family:system-ui,sans-serif}</style>
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1?external=react",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?external=react",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
    "@excalidraw/excalidraw": "https://esm.sh/@excalidraw/excalidraw@0.17.6?external=react,react-dom"
  }
}
</script>
</head><body>
<div id="root"></div>
<script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
(async function(){
  try {
    const input = ${json};
    const elements = Array.isArray(input)
      ? convertToExcalidrawElements(input)
      : Array.isArray(input?.elements) ? convertToExcalidrawElements(input.elements) : [];
    const appState = (input && typeof input === 'object' && !Array.isArray(input) && input.appState) || { viewBackgroundColor: '#fafafa' };
    const initialData = { elements, appState, scrollToContent: true };
    createRoot(document.getElementById('root')).render(
      React.createElement(Excalidraw, {
        initialData,
        viewModeEnabled: false,
        zenModeEnabled: false,
        gridModeEnabled: false,
      })
    );
  } catch(e){
    document.body.innerHTML = '<pre style="color:#b91c1c;padding:16px;font-family:ui-monospace">'+String(e && (e.stack||e.message))+'</pre>';
    try{parent.postMessage({__llmatlas_console:true,level:'error',text:String(e)},'*');}catch(_){};
  }
})();
</script>
</body></html>`;
}

export function WhiteboardRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(() => buildDoc(content), [content]);
  return (
    <iframe
      key={reloadKey}
      title="Whiteboard artifact"
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
    />
  );
}
