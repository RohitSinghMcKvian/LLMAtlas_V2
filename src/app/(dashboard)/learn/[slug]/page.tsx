"use client";

import { use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, Clock, BookOpen, CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLesson, LESSONS } from "@/lib/learn-content";
import { useProgressStore } from "@/lib/store";

export default function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const lesson = getLesson(slug);
  const completed = useProgressStore((s) => s.completed);
  const complete = useProgressStore((s) => s.complete);

  if (!lesson) notFound();
  const isDone = !!completed[slug];

  const currentIdx = LESSONS.findIndex((l) => l.slug === slug);
  const next = LESSONS[currentIdx + 1];

  return (
    <div className="container max-w-3xl py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Learn
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="learn">{lesson.category}</Badge>
          <Badge variant="outline">{lesson.level}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{lesson.minutes} min read
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {lesson.title}
        </h1>
        <p className="text-lg text-muted-foreground">{lesson.summary}</p>
      </motion.div>

      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="prose prose-lg dark:prose-invert max-w-none mt-10
                   prose-headings:font-bold prose-headings:tracking-tight
                   prose-h2:text-2xl prose-h3:text-xl
                   prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                   prose-pre:bg-card prose-pre:border prose-pre:rounded-lg prose-pre:text-sm
                   prose-code:before:hidden prose-code:after:hidden
                   prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
      </motion.article>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-10 pt-8 border-t flex flex-col sm:flex-row gap-3 items-center justify-between"
      >
        <Button
          variant={isDone ? "outline" : "default"}
          onClick={() => complete(slug)}
          disabled={isDone}
        >
          {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CheckCircle2 className="h-4 w-4" />}
          {isDone ? "Lesson complete" : "Mark complete"}
        </Button>

        {next && (
          <Button asChild variant="gradient" className="ml-auto">
            <Link href={`/learn/${next.slug}`}>
              Next: {next.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid sm:grid-cols-2 gap-4 mt-8"
      >
        <Link href="/playground">
          <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <Sparkles className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="font-semibold mb-1">Try it in the Playground</h3>
              <p className="text-xs text-muted-foreground">
                Apply what you learned with a free model.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/learn">
          <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <BookOpen className="h-5 w-5 text-sky-500 mb-2" />
              <h3 className="font-semibold mb-1">Browse all lessons</h3>
              <p className="text-xs text-muted-foreground">
                {LESSONS.length} lessons across {[...new Set(LESSONS.map((l) => l.category))].length} categories.
              </p>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </div>
  );
}
