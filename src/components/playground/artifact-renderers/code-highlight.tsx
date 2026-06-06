"use client";

import { PrismAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
  wrapLongLines?: boolean;
}

// Map common fenced-block language tags / file extensions to Prism grammar names.
const LANG_ALIAS: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
  md: "markdown",
  yml: "yaml",
  rs: "rust",
  kt: "kotlin",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  golang: "go",
  text: "text",
  txt: "text",
};

export function normalizeLang(lang?: string): string {
  const l = (lang || "").toLowerCase().trim();
  return LANG_ALIAS[l] ?? l ?? "text";
}

/**
 * Shared Prism syntax highlighter used by both the artifact code view and inline
 * chat code blocks. `PrismAsync` code-splits the highlighter core + all language
 * grammars so the base bundle stays small. Always rendered on a dark surface
 * (Claude-style code blocks), so the dark theme is used regardless of app theme.
 */
export function CodeHighlight({ code, language, showLineNumbers, className, wrapLongLines }: Props) {
  return (
    <SyntaxHighlighter
      language={normalizeLang(language)}
      style={oneDark}
      showLineNumbers={showLineNumbers}
      wrapLongLines={wrapLongLines}
      PreTag="div"
      className={className}
      customStyle={{
        margin: 0,
        background: "transparent",
        fontSize: "0.8125rem",
        lineHeight: 1.6,
        padding: "1rem",
      }}
      codeTagProps={{
        style: { fontFamily: "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" },
      }}
      lineNumberStyle={{ opacity: 0.35, minWidth: "2.5em", userSelect: "none" }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
