"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RichMarkdown — full-featured markdown renderer for compare cells.
//
// Capabilities (parity with Perplexity / Claude / LM-Arena answer panels):
//   • GFM (tables, strikethrough, task lists)
//   • LaTeX math — inline $..$ and block $$..$$ via remark-math + rehype-katex
//   • Syntax-highlighted code blocks with copy button (Prism)
//   • Inline Mermaid diagrams from ```mermaid fences (theme-aware)
//   • Inline SVG from ```svg fences (sandboxed iframe)
//   • Raw HTML passthrough (rehype-raw) for embedded markup
//   • Responsive images
//   • Tables wrapped in horizontal-scroll containers
//
// All long content (URLs, code, tables) is constrained to its parent's width.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Check, Copy } from "lucide-react";

import { CodeHighlight } from "@/components/playground/artifact-renderers/code-highlight";
import { MermaidRenderer } from "@/components/playground/artifact-renderers/mermaid-renderer";
import { SvgRenderer } from "@/components/playground/artifact-renderers/svg-renderer";
import { cn, copyToClipboard, stripArtifactTags } from "@/lib/utils";

interface Props {
  content: string;
  /** Streaming text: render as raw plaintext (no markdown parse) for smooth incremental UI. */
  streaming?: boolean;
  /** Compact mode = compare cell (smaller fonts, tighter spacing). */
  compact?: boolean;
}

function RichMarkdownImpl({ content, streaming, compact = true }: Props) {
  if (!content) return null;

  if (streaming) {
    return (
      <pre
        className={cn(
          "m-0 whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-sans leading-relaxed",
          compact ? "text-sm" : "text-base",
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {content}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none break-words",
        compact ? "prose-sm" : "prose-base",
        "prose-p:my-1.5 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5",
        "prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0",
        "prose-code:before:hidden prose-code:after:hidden",
        "prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
        "prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground",
        "prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline",
        "[&_a]:break-all [&_code]:break-words [&_img]:max-w-full [&_img]:h-auto",
      )}
      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Hide custom artifact tags (model may emit them); we don't render them inline.
          // @ts-expect-error — non-standard tag
          artifact: () => null,
          code({ className, children, ...rest }) {
            return (
              <CodeOrSpecial className={className} {...rest}>
                {children}
              </CodeOrSpecial>
            );
          },
          // Strip default <pre> wrapper — our CodeBlock provides its own.
          pre({ children }) { return <>{children}</>; },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-xs">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-border/60 bg-muted/50 px-3 py-2 text-left font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-border/30 px-3 py-2 last:border-0">{children}</td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 rounded-r-lg border-l-2 border-primary/40 bg-muted/20 py-1 pl-4 text-muted-foreground">
                {children}
              </blockquote>
            );
          },
          img({ src, alt }) {
            // Skip if src can't be resolved.
            if (!src) return null;
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ""} loading="lazy" className="my-2 rounded-lg" />;
          },
        }}
      >
        {stripArtifactTags(content)}
      </ReactMarkdown>
    </div>
  );
}

/** Inline code OR a special fenced block (mermaid / svg / code with copy). */
function CodeOrSpecial({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  const language = (/language-(\w+)/.exec(className || "")?.[1] ?? "").toLowerCase();
  const code = String(children).replace(/\n$/, "");
  const isBlock = code.includes("\n") || code.length > 80;

  // Inline code
  if (!isBlock) {
    return (
      <code
        className="rounded border border-border/50 bg-muted/80 px-1 py-0.5 font-mono text-[0.82em]"
        {...rest}
      >
        {children}
      </code>
    );
  }

  // Mermaid diagrams
  if (language === "mermaid") {
    return (
      <div className="my-3 overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          mermaid
        </div>
        <div className="h-[260px] w-full">
          <MermaidRenderer content={code} />
        </div>
      </div>
    );
  }

  // Inline SVG
  if (language === "svg") {
    return (
      <div className="my-3 overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/30 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          svg
        </div>
        <div className="h-[260px] w-full">
          <SvgRenderer content={code} />
        </div>
      </div>
    );
  }

  // Syntax-highlighted code block with copy button
  const copy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-border/60 bg-[hsl(222,47%,8%)] dark:bg-[hsl(222,47%,5%)]">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/code:opacity-100"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <CodeHighlight code={code} language={language} />
      </div>
    </div>
  );
}

export const RichMarkdown = memo(RichMarkdownImpl, (a, b) =>
  a.content === b.content && a.streaming === b.streaming && a.compact === b.compact,
);
