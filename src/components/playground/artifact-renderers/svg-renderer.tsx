"use client";

import { useMemo } from "react";

interface Props {
  content: string;
  reloadKey?: number;
}

const CHECKER =
  "background-color:#fafafa;background-image:linear-gradient(45deg,#eaeaea 25%,transparent 25%),linear-gradient(-45deg,#eaeaea 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eaeaea 75%),linear-gradient(-45deg,transparent 75%,#eaeaea 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0";

/**
 * Wraps SVG markup inside a fully sandboxed iframe so any embedded <script> can't
 * touch the parent. Centers and scales the SVG to fit, on a checkerboard so
 * transparency is visible (Claude-style).
 */
export function SvgRenderer({ content, reloadKey = 0 }: Props) {
  const srcdoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:16px;box-sizing:border-box;height:100%;${CHECKER};display:flex;align-items:center;justify-content:center}svg{max-width:100%;max-height:100%;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.12))}</style></head><body>${content}</body></html>`,
    [content],
  );
  return (
    <iframe
      key={reloadKey}
      title="SVG artifact preview"
      srcDoc={srcdoc}
      sandbox=""
      className="w-full h-full border-0"
    />
  );
}
