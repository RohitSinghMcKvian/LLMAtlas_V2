"use client";

import { User, Sparkles, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { memo, useState, useCallback, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { cn, copyToClipboard, stripArtifactTags } from "@/lib/utils";
import { CodeHighlight } from "./artifact-renderers/code-highlight";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  meta?: string;
  timestamp?: number;
  messageId?: string;
}

/**
 * Anthropic-style brand-logo thinking indicator.
 *
 * Uses a self-contained inline SVG so the drop-shadow glow is
 * never swallowed by a parent stacking context (unlike z-index: -1).
 *
 * Three layers of animation:
 *   1. Outer breathe  — scale 1 → 1.16 → 1  (2 s)
 *   2. Glow pulse     — drop-shadow intensity via filter keyframe
 *   3. Shimmer sweep  — bright arc travels the full hex perimeter (2.6 s)
 *   4. Dot cascade    — three brand-gradient dots stagger-pulse below
 */
function ThinkingHex() {
  const uid = useId().replace(/:/g, "x");

  /* Flat-top hex path (R=43, centre 50 50, 100×100 viewBox) */
  const HEX = "M 28.5 12.8 L 71.5 12.8 L 93 50 L 71.5 87.2 L 28.5 87.2 L 7 50 Z";

  /* Drop-shadow values: idle → bright → idle  (drives the glow pulse) */
  const glowIdle   = "drop-shadow(0 0  6px rgba(168,85,247,0.55)) drop-shadow(0 0 12px rgba(99,102,241,0.30))";
  const glowBright = "drop-shadow(0 0 12px rgba(168,85,247,0.95)) drop-shadow(0 0 24px rgba(99,102,241,0.65)) drop-shadow(0 0 36px rgba(251,191,36,0.30))";

  return (
    <motion.div
      className="flex items-center gap-3 mt-1.5 py-1"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0  }}
      exit={{    opacity: 0, x: -6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* ── Hex mark — breathe + drop-shadow glow ── */}
      <motion.div
        animate={{
          scale:  [1, 1.16, 1],
          filter: [glowIdle, glowBright, glowIdle],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden
          focusable="false"
        >
          <defs>
            {/* Brand gradient: amber → pink → violet → indigo */}
            <linearGradient
              id={`tg-${uid}`}
              x1="7" y1="87" x2="90" y2="10"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#FBBF24" />
              <stop offset="30%"  stopColor="#E879B0" />
              <stop offset="65%"  stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>

          {/* Base gradient-stroke hexagon */}
          <path
            d={HEX}
            stroke={`url(#tg-${uid})`}
            strokeWidth="6.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {/* Traveling shimmer arc (7 % of perimeter) */}
          <motion.path
            d={HEX}
            stroke="rgba(255,255,255,0.70)"
            strokeWidth="6.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
            initial={{ pathOffset: 0, pathLength: 0.07 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* ── Staggered brand-gradient dots ── */}
      <div className="flex items-center gap-1.5">
        {(["#FBBF24", "#A855F7", "#6366F1"] as const).map((colour, i) => (
          <motion.span
            key={i}
            className="block rounded-full"
            style={{ width: 6, height: 6, background: colour }}
            animate={{
              opacity: [0.25, 1,    0.25],
              scale:   [0.65, 1.4,  0.65],
            }}
            transition={{
              duration: 1.2,
              repeat:   Infinity,
              delay:    i * 0.22,
              ease:     "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Syntax-highlighted code block for markdown
function CodeBlock({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className || "")?.[1] ?? "";
  const code = String(children).replace(/\n$/, "");
  const isBlock = code.includes("\n") || code.length > 80;

  if (!isBlock) {
    return (
      <code className="bg-muted/80 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-border/50" {...rest}>
        {children}
      </code>
    );
  }

  const copy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-border/60 bg-[hsl(222,47%,8%)] dark:bg-[hsl(222,47%,5%)]">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/40">
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{language || "code"}</span>
        <button
          onClick={copy}
          className="opacity-0 group-hover/code:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
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

function ChatMessageImpl({ role, content, streaming, meta, timestamp, messageId }: Props) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current) window.speechSynthesis?.cancel();
    };
  }, []);

  const onCopy = useCallback(async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  const toggleSpeech = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    // Strip markdown/LaTeX for cleaner TTS
    const clean = content
      .replace(/```[\s\S]*?```/g, " code block. ")
      .replace(/`[^`]+`/g, "")
      .replace(/\$\$[\s\S]*?\$\$/g, " math expression. ")
      .replace(/\$[^$]+\$/g, " math. ")
      .replace(/[#*_~[\]()]/g, "")
      .replace(/https?:\/\/\S+/g, " link ")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [content, speaking]);

  if (role === "system") {
    return (
      <div className="text-xs text-muted-foreground italic px-4 py-2">
        System: {content}
      </div>
    );
  }

  const isUser = role === "user";
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className={cn(
        "group flex gap-3 py-5 px-4 md:px-6 animate-in fade-in slide-in-from-bottom-1 duration-200 transition-colors",
        isUser ? "bg-transparent" : "bg-muted/20 hover:bg-muted/30",
      )}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm",
            isUser
              ? "bg-gradient-to-br from-slate-500 to-slate-700"
              : "bg-gradient-to-br from-blue-500 via-violet-500 to-indigo-600",
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold">{isUser ? "You" : "Assistant"}</span>
          {meta && (
            <span className="text-xs font-normal text-muted-foreground">{meta}</span>
          )}
          {formattedTime && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-opacity duration-150 ml-auto",
                showTime ? "opacity-100" : "opacity-0",
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              {formattedTime}
            </span>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "text-sm leading-relaxed min-w-0",
          !isUser && "prose prose-sm dark:prose-invert max-w-none",
          "prose-p:my-2 prose-p:leading-relaxed",
          "prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 prose-pre:rounded-none",
          "prose-code:before:hidden prose-code:after:hidden",
          "prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
          "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
          "prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground",
          "prose-table:text-xs",
          "prose-strong:font-semibold",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        )}>
          {content ? (
            streaming ? (
              <>
                <pre className="whitespace-pre-wrap font-sans m-0 p-0 text-sm leading-relaxed bg-transparent border-0">{content}</pre>
                <ThinkingHex />
              </>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={{
                  // @ts-expect-error — 'artifact' is not a standard HTML element but models may emit it
                  artifact: () => null,
                  code({ className, children, ...rest }) {
                    return <CodeBlock className={className} {...rest}>{children}</CodeBlock>;
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3 rounded-lg border border-border/60">
                        <table className="w-full text-xs">{children}</table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="px-3 py-2 text-left font-semibold bg-muted/50 border-b border-border/60">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-3 py-2 border-b border-border/30 last:border-0">{children}</td>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-2 border-primary/40 pl-4 py-1 my-3 text-muted-foreground bg-muted/20 rounded-r-lg">
                        {children}
                      </blockquote>
                    );
                  },
                }}
              >
                {stripArtifactTags(content)}
              </ReactMarkdown>
            )
          ) : streaming ? (
            <ThinkingHex />
          ) : (
            <span className="text-muted-foreground italic">…</span>
          )}
        </div>

        {/* Action row — visible on hover for assistant, always for inline copy */}
        {!streaming && content && !isUser && (
          <div className="flex items-center gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={toggleSpeech}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                speaking
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              title={speaking ? "Stop reading" : "Read aloud"}
            >
              {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <div className="w-px h-4 bg-border/60 mx-1" />
            <button
              onClick={() => setReaction(reaction === "up" ? null : "up")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                reaction === "up"
                  ? "text-green-500 bg-green-500/10"
                  : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10",
              )}
              title="Good response"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setReaction(reaction === "down" ? null : "down")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                reaction === "down"
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
              )}
              title="Poor response"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageImpl, (a, b) =>
  a.role === b.role &&
  a.content === b.content &&
  a.streaming === b.streaming &&
  a.meta === b.meta &&
  a.timestamp === b.timestamp,
);
