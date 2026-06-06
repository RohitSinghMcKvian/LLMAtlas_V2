"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeHighlight } from "./code-highlight";

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="w-full h-full overflow-auto p-6 sm:p-8 bg-background">
      <article className="prose prose-sm dark:prose-invert max-w-3xl mx-auto prose-headings:font-semibold prose-pre:p-0 prose-pre:bg-transparent prose-code:before:hidden prose-code:after:hidden">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ className, children, ...rest }) {
              const lang = /language-(\w+)/.exec(className || "")?.[1];
              const text = String(children).replace(/\n$/, "");
              const isBlock = text.includes("\n") || (lang && text.length > 0);
              if (!isBlock) {
                return (
                  <code className="bg-muted/80 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-border/50" {...rest}>
                    {children}
                  </code>
                );
              }
              return (
                <div className="my-3 rounded-xl overflow-hidden border border-border/60 bg-[#282c34] dark:bg-[#1e2127]">
                  <CodeHighlight code={text} language={lang} />
                </div>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
            a({ href, children }) {
              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
