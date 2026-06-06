"use client";

import { useState } from "react";
import { Check, Copy, WrapText } from "lucide-react";
import { CodeHighlight } from "./code-highlight";
import { copyToClipboard, cn } from "@/lib/utils";

interface Props {
  content: string;
  language?: string;
}

/**
 * Read-only, syntax-highlighted code view with line numbers, soft-wrap toggle,
 * and one-click copy — the artifact-panel equivalent of a code editor pane.
 */
export function CodeRenderer({ content, language }: Props) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const lines = content.split("\n").length;

  const copy = async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#282c34] dark:bg-[#1e2127]">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/20 text-[11px] text-white/60">
        <span className="font-mono uppercase tracking-wide">{language || "code"}</span>
        <div className="flex items-center gap-1">
          <span className="tabular-nums mr-1">{lines} {lines === 1 ? "line" : "lines"}</span>
          <button
            onClick={() => setWrap((w) => !w)}
            className={cn("p-1 rounded hover:bg-white/10 transition-colors", wrap && "text-white bg-white/10")}
            title={wrap ? "Disable soft wrap" : "Enable soft wrap"}
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>
          <button onClick={copy} className="p-1 rounded hover:bg-white/10 transition-colors" title="Copy code">
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeHighlight code={content} language={language} showLineNumbers wrapLongLines={wrap} />
      </div>
    </div>
  );
}
