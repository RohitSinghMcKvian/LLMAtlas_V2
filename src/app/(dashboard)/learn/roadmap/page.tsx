"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Map } from "lucide-react";
import { RoadmapGraph } from "@/components/learn/RoadmapGraph";
import { LEVELS, totalChapters } from "@/lib/curriculum";
import { useLearnStore } from "@/lib/store";

export default function RoadmapPage() {
  const quizPassed = useLearnStore((s) => s.quizPassed);
  const totalDone = Object.keys(quizPassed).length;
  const overallPercent = (totalDone / totalChapters()) * 100;

  return (
    <div className="container max-w-6xl py-10">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Learn hub
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
          <Map className="h-3.5 w-3.5" />
          The full roadmap
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          From zero to{" "}
          <span className="gradient-text-blue">AI engineer</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Five levels. Twenty-five chapters. One hundred quiz questions. Each level unlocked by completing the last,
          each crowned with a certificate.
        </p>
        {/* Overall progress */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-bold">
              {totalDone}/{totalChapters()} · {Math.round(overallPercent)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallPercent}%` }}
              transition={{ duration: 1 }}
              style={{
                background: "linear-gradient(90deg, #0EA5E9, #8B5CF6, #F59E0B, #10B981, #EF4444)",
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Big roadmap graph */}
      <div className="mb-16 rounded-3xl border bg-card/40 p-8 md:p-12">
        <RoadmapGraph />
      </div>

      {/* Detailed level list */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">All levels & chapters</h2>
        {LEVELS.map((level, li) => (
          <motion.div
            key={level.slug}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: li * 0.06 }}
            className="rounded-2xl border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full font-mono font-bold text-sm text-white"
                  style={{ backgroundColor: level.color }}
                >
                  L{level.number}
                </span>
                <div>
                  <Link
                    href={`/learn/level/${level.slug}`}
                    className="font-bold text-lg hover:underline"
                    style={{ color: level.color }}
                  >
                    {level.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{level.tagline}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {level.chapters.length} chapters · ~{level.estimatedHours}h
              </span>
            </div>
            <ul className="ml-12 space-y-1 text-sm">
              {level.chapters.map((c, ci) => (
                <li key={c.slug} className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-xs">{ci + 1}.</span>
                  <Link
                    href={`/learn/level/${level.slug}/${c.slug}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {c.title}
                  </Link>
                  {quizPassed[c.slug] && (
                    <span className="text-emerald-500 text-xs">✓</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
