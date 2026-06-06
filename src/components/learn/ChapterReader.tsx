"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Chapter, Level } from "@/lib/curriculum";
import { ChapterDiagram } from "./ChapterDiagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChapterReaderProps {
  level: Level;
  chapter: Chapter;
  prev: { levelSlug: string; chapterSlug: string } | null;
  next: { levelSlug: string; chapterSlug: string } | null;
  chapterIndex: number;
}

/**
 * Splits content into alternating markdown/diagram blocks so figures
 * never end up inside markdown <p> wrappers (which would cause hydration errors).
 */
function splitContent(content: string): { type: "md" | "diagram"; value: string }[] {
  const parts: { type: "md" | "diagram"; value: string }[] = [];
  const re = /```diagram:([\w-]+)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "md", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "diagram", value: match[1] });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "md", value: content.slice(lastIndex) });
  }
  return parts;
}

export function ChapterReader({ level, chapter, prev, next, chapterIndex }: ChapterReaderProps) {
  const [progress, setProgress] = useState(0);

  // Scroll progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const parts = useMemo(() => splitContent(chapter.content), [chapter.content]);

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-14 left-0 right-0 z-30 h-1 bg-transparent">
        <motion.div
          className="h-full"
          style={{ width: `${progress}%`, backgroundColor: level.color }}
        />
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/learn" className="hover:text-foreground">Learn</Link>
          <span>/</span>
          <Link href={`/learn/level/${level.slug}`} className="hover:text-foreground" style={{ color: level.color }}>
            {level.title}
          </Link>
          <span>/</span>
          <span>Chapter {chapterIndex + 1}</span>
        </div>

        {/* Chapter header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" style={{ borderColor: level.color, color: level.color }}>
              Level {level.number} · {level.title}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {chapter.minutes} min
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{chapter.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{chapter.summary}</p>
        </motion.div>

        {/* Markdown + diagram parts */}
        {parts.map((part, i) =>
          part.type === "diagram" ? (
            <ChapterDiagram key={i} id={part.value} />
          ) : (
            <div
              key={i}
              className="prose prose-lg dark:prose-invert max-w-none
                        prose-headings:font-bold prose-headings:tracking-tight
                        prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl
                        prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl
                        prose-p:leading-relaxed
                        prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
                        prose-code:before:content-none prose-code:after:content-none
                        prose-code:text-sm prose-code:font-mono
                        prose-pre:bg-muted/40 prose-pre:border
                        prose-strong:text-foreground prose-strong:font-semibold
                        prose-a:text-primary hover:prose-a:underline
                        prose-blockquote:border-l-4 prose-blockquote:italic
                        prose-table:my-6
                        prose-th:bg-muted prose-th:font-semibold
                        prose-td:py-2 prose-th:py-2
                        "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.value}</ReactMarkdown>
            </div>
          ),
        )}

        {/* Prev/Next navigation */}
        <div className="mt-12 flex items-center justify-between gap-3">
          {prev ? (
            <Button variant="outline" asChild>
              <Link href={`/learn/level/${prev.levelSlug}/${prev.chapterSlug}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {next ? (
            <Button variant="outline" asChild>
              <Link href={`/learn/level/${next.levelSlug}/${next.chapterSlug}`}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </div>
      </article>
    </>
  );
}
